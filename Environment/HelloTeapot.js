
/**
 * @file A WebGL program rendering a skybox and a model from OBJ files 
 * @author Eric Shaffer and Dana Sim 
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global Simple GLSL shader program */
var shaderProgram;
var shaderProgramTeapotNR;
var shaderProgramTeapotR;
var shaderProgramSkybox;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The View matrix inverted */
var invVMatrix = mat3.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The Normal matrix used for reflection */
var nMatrixR = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global Objects holding the geometry for a 3D mesh */
var myMesh;     //teapot
var myCube;     //skybox

// used to make model scale
var scaleVertex = vec3.create();

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0,0,2);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [1,1,1];
var worldLightPosition = vec3.create();
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.25,0.25,0.25];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [0.75,0.75,0.75];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0.5,0.5,0.5];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [0.5,0.5,0.5];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [163.0/255.0,163.0/255.0,194.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.5,0.5,0.5];
/** @global Shininess exponent for Phong reflection */
var shininess = 25;
/** @global Edge color for wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

/** @global Euler angles to determine orinetation of camera */
var eulerX = 0;
var eulerY = 0;

/** @global Array to hold currently pressed key */
var currentlyPressedKeys = {};

//Texture parameters for cube map
var cubeImage = new Array(6);
var cubeTexture;
var cubeLoaded = 0; //keep track of how many textures were loaded

//Different skyboxes to use
var city = [
    'Images/city/pos-x.jpg',
    'Images/city/neg-x.jpg',
    'Images/city/pos-y.jpg',
    'Images/city/neg-y.jpg',
    'Images/city/pos-z.jpg',
    'Images/city/neg-z.jpg'
];
var mountain = [
    'Images/mountain/pos-x.jpg',
    'Images/mountain/neg-x.jpg',
    'Images/mountain/pos-y.jpg',
    'Images/mountain/neg-y.jpg',
    'Images/mountain/pos-z.jpg',
    'Images/mountain/neg-z.jpg'
];
var beach = [
    'Images/beach/pos-x.jpg',
    'Images/beach/neg-x.jpg',
    'Images/beach/pos-y.jpg',
    'Images/beach/neg-y.jpg',
    'Images/beach/pos-z.jpg',
    'Images/beach/neg-z.jpg'
];
var currentMap = mountain;

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
  console.log("Getting text file");
  return new Promise((resolve,reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url);
      xhr.onload = () => resolve(xhr.responseText);
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send();
      console.log("Made promise");
  });
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
    if ((document.getElementById("noreflect").checked)) {
        mat3.fromMat4(nMatrix,mvMatrix);
        mat3.transpose(nMatrix,nMatrix);
        mat3.invert(nMatrix,nMatrix);
        gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
    }
    if ((document.getElementById("reflect").checked)) {
        gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrixR);
    }
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the inverted view matrix to the shader
 */
function uploadInvViewMatrixToShader() {
    gl.uniformMatrix3fv(shaderProgram.uInvVMatrix, false, invVMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
    uploadInvViewMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders to be used with the teapot without reflection
 */
function setupShadersTeapotNR() {
  vertexShader = loadShaderFromDOM("shader-blinn-phong-vs");
  fragmentShader = loadShaderFromDOM("shader-blinn-phong-fs");
  
  shaderProgramTeapotNR = gl.createProgram();
  gl.attachShader(shaderProgramTeapotNR, vertexShader);
  gl.attachShader(shaderProgramTeapotNR, fragmentShader);
  gl.linkProgram(shaderProgramTeapotNR);

  if (!gl.getProgramParameter(shaderProgramTeapotNR, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  //gl.useProgram(shaderProgramTeapot);

  shaderProgramTeapotNR.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTeapotNR, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramTeapotNR.vertexPositionAttribute);

  shaderProgramTeapotNR.vertexNormalAttribute = gl.getAttribLocation(shaderProgramTeapotNR, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramTeapotNR.vertexNormalAttribute);

  shaderProgramTeapotNR.mvMatrixUniform = gl.getUniformLocation(shaderProgramTeapotNR, "uMVMatrix");
  shaderProgramTeapotNR.pMatrixUniform = gl.getUniformLocation(shaderProgramTeapotNR, "uPMatrix");
  shaderProgramTeapotNR.nMatrixUniform = gl.getUniformLocation(shaderProgramTeapotNR, "uNMatrix");

  shaderProgramTeapotNR.uniformLightPositionLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uLightPosition");  
  shaderProgramTeapotNR.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uAmbientLightColor");  
  shaderProgramTeapotNR.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uDiffuseLightColor");
  shaderProgramTeapotNR.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uSpecularLightColor");
  shaderProgramTeapotNR.uniformShininessLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uShininess");    
  shaderProgramTeapotNR.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uKAmbient");  
  shaderProgramTeapotNR.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uKDiffuse");
  shaderProgramTeapotNR.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgramTeapotNR, "uKSpecular");
}

/**
 * Setup the fragment and vertex shaders to be used with the teapot with reflection
 */
function setupShadersTeapotR() {
  vertexShader = loadShaderFromDOM("reflection-vs");
  fragmentShader = loadShaderFromDOM("reflection-fs");

  shaderProgramTeapotR = gl.createProgram();
  gl.attachShader(shaderProgramTeapotR, vertexShader);
  gl.attachShader(shaderProgramTeapotR, fragmentShader);
  gl.linkProgram(shaderProgramTeapotR);

  if (!gl.getProgramParameter(shaderProgramTeapotR, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  //gl.useProgram(shaderProgramSkybox);

  shaderProgramTeapotR.vertexPositionAttribute = gl.getAttribLocation(shaderProgramTeapotR, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramTeapotR.vertexPositionAttribute);
    
  shaderProgramTeapotR.vertexNormalAttribute = gl.getAttribLocation(shaderProgramTeapotR, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramTeapotR.vertexNormalAttribute);

  shaderProgramTeapotR.mvMatrixUniform = gl.getUniformLocation(shaderProgramTeapotR, "uMVMatrix");
  shaderProgramTeapotR.pMatrixUniform = gl.getUniformLocation(shaderProgramTeapotR, "uPMatrix");
  shaderProgramTeapotR.nMatrixUniform = gl.getUniformLocation(shaderProgramTeapotR, "uNMatrix");
  shaderProgramTeapotR.uInvVMatrix = gl.getUniformLocation(shaderProgramTeapotR, "invVMatrix");
}

/**
 * Setup the fragment and vertex shaders to be used with the skybox
 */
function setupShadersCube() {
  vertexShader = loadShaderFromDOM("cube-vs");
  fragmentShader = loadShaderFromDOM("cube-fs");

  shaderProgramSkybox = gl.createProgram();
  gl.attachShader(shaderProgramSkybox, vertexShader);
  gl.attachShader(shaderProgramSkybox, fragmentShader);
  gl.linkProgram(shaderProgramSkybox);

  if (!gl.getProgramParameter(shaderProgramSkybox, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  //gl.useProgram(shaderProgramSkybox);

  shaderProgramSkybox.texCoordAttribute = gl.getAttribLocation(shaderProgramSkybox, "aTexCoord");
  console.log("Tex coord attrib: ", shaderProgramSkybox.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgramSkybox.texCoordAttribute);

  shaderProgramSkybox.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSkybox, "aVertexPosition");
  console.log("Vertex attrib: ", shaderProgramSkybox.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);

  shaderProgramSkybox.mvMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uMVMatrix");
  shaderProgramSkybox.pMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uPMatrix");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
 * Creates texture for use with the skycube
 * @param {StringArray} URL of image files to be used
 */
function setupTextures(img) {
    //console.log("Setting up textures of ", currentMap);
    var targets = [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z 
    ];
    for (var j = 0; j < 6; j++) {
        cubeImage[j] = new Image();
        cubeImage[j].onload = function() { 
            cubeLoaded++;
            if (cubeLoaded == 6) {
                cubeTexture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
                for (var i = 0; i < 6; i++) {
                    handleTextureLoaded(cubeImage[i], cubeTexture, targets[i]);
                }
            } 
        }
        cubeImage[j].src = img[j];
    };
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture, target) {
  //console.log("handleTextureLoaded, image = " + image.src);
  gl.texImage2D(target, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
     gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     //console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn off mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     //console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data - Teapot Mesh
 */
function setupMesh(filename) {
   myMesh = new TriMesh();
   myPromise = asyncGetFile(filename);
   // We define what to do when the promise is resolved with the then() call,
   // and what to do when the promise is rejected with the catch() call
   myPromise.then((retrievedText) => {
       myMesh.loadFromOBJ(retrievedText);
       console.log("Yay! Got the file");
   })
   .catch(
        // Log the rejection reason
        (reason) => {
        console.log('Handle rejected promise (' +reason+') here.');
        });
}

/**
 * Populate buffers with data - Cube Mesh
 */
function setupCube() {
  myCube = new CubeMesh(200);
}


//----------------------------------------------------------------------------------
/**
 * Setup perspective and view matrices
 */
function draw() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 500.0);
    
    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    
    // Then generate the lookat matrix and initialize the view matrix to that view
    mat4.lookAt(vMatrix,eyePt,viewPt,up);
    
    drawCube();
    drawTeapot();
}

/**
 * Draw a cube based on buffers
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function drawCube(){
    //console.log("function drawCube()");
    
    gl.useProgram(shaderProgramSkybox);
    shaderProgram = shaderProgramSkybox;
    
    mvPushMatrix();
    
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(eulerX));
    
    vec3.set(scaleVertex, 1.0, 1.0, 1.0);
    vec3.scale(scaleVertex,scaleVertex,0.05);   
    mat4.scale(mvMatrix, mvMatrix, scaleVertex);

    mat4.multiply(mvMatrix,vMatrix,mvMatrix);
    setMatrixUniforms();

    if (cubeLoaded == 6) {
        myCube.draw();
    }
    mvPopMatrix();
  
}

/**
 * Draw a teapot based on buffers
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function drawTeapot() {
    //console.log("function drawMesh()");
    
    if ((document.getElementById("noreflect").checked)) {
        gl.useProgram(shaderProgramTeapotNR);
        shaderProgram = shaderProgramTeapotNR;
    }
    if ((document.getElementById("reflect").checked)) {
        gl.useProgram(shaderProgramTeapotR);
        shaderProgram = shaderProgramTeapotR;
        
        //Make sure normal moves with teapot
        mvPushMatrix();
        mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
        mat4.rotateX(mvMatrix, mvMatrix, degToRad(eulerX));
        mat4.multiply(mvMatrix,vMatrix,mvMatrix);
        mat3.fromMat4(invVMatrix, mvMatrix);
        mat3.invert(invVMatrix,invVMatrix);
        mat3.normalFromMat4(nMatrixR, mvMatrix);
        setMatrixUniforms();
        mvPopMatrix();
    }

    //Make sure light moves with teapot
    mvPushMatrix();
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(eulerX));
    mat4.multiply(mvMatrix,vMatrix,mvMatrix);
    setMatrixUniforms();
    vec3.transformMat4(worldLightPosition, lightPosition, mvMatrix);
    setLightUniforms(worldLightPosition,lAmbient,lDiffuse,lSpecular);
    mvPopMatrix();
    
    //Draw Mesh
    if (myMesh.loaded()) {
        mvPushMatrix();
        
        mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
        mat4.rotateX(mvMatrix, mvMatrix, degToRad(eulerX));
        
        vec3.set(scaleVertex, 1.0, 1.0, 1.0);
        vec3.scale(scaleVertex,scaleVertex,0.15);   
        mat4.scale(mvMatrix, mvMatrix, scaleVertex);
        
        mat4.translate(mvMatrix, mvMatrix, [0,-1.5,0]); //make model look centered
        
        mat4.multiply(mvMatrix,vMatrix,mvMatrix);
        setMatrixUniforms();
        
        if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
        {
            setMaterialUniforms(shininess,kAmbient,
                                kTerrainDiffuse,kSpecular); 
            myMesh.drawTriangles();
        }
    
        if(document.getElementById("wirepoly").checked)
        {   
            setMaterialUniforms(shininess,kAmbient,
                                kEdgeBlack,kSpecular);
            myMesh.drawEdges();
        }   

        if(document.getElementById("wireframe").checked)
        {
            setMaterialUniforms(shininess,kAmbient,
                                kEdgeWhite,kSpecular);
            myMesh.drawEdges();
        } 
        mvPopMatrix();
    }
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
        //console.log("Key down ", event.key, " code ", event.code);
    
        //change eulerY 
        currentlyPressedKeys[event.key] = true;
          if (currentlyPressedKeys["ArrowLeft"]) {
            event.preventDefault();
            eulerY-= 1;
        } else if (currentlyPressedKeys["ArrowRight"]) {
            event.preventDefault();
            eulerY+= 1;
        } 
    
        //change eulerX
        if (currentlyPressedKeys["ArrowUp"]){
            event.preventDefault();
            eulerX-= 1;
        } else if (currentlyPressedKeys["ArrowDown"]){
            event.preventDefault();
            eulerX+= 1;
        } 
    
        //change z position
        if (currentlyPressedKeys["w"]){
            event.preventDefault();
            eyePt[2]+= 0.01;
        } else if (currentlyPressedKeys["s"]){
            event.preventDefault();
            eyePt[2]-= 0.01;
        } 
    
        //reset view
        if (currentlyPressedKeys["r"]){
            event.preventDefault();
            eulerX = 0;
            eulerY = 0;
            eyePt[2] = 2;
        }
}

function handleKeyUp(event) {
        //console.log("Key up ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = false;
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    setupTextures(mountain); //initial texture is mountain
    setupCube();
    setupShadersCube();
    setupShadersTeapotNR();
    setupShadersTeapotR();
    setupMesh("Images/teapot_0.obj");
    tick();
}

//----------------------------------------------------------------------------------
/**
  * Update any transformations
  */
function animate() {
    //console.log(eulerX, " ", eulerY, " ", eulerZ); 
    document.getElementById("eY").value=eulerY%360;
    document.getElementById("eX").value=eulerX%360;
    document.getElementById("eZ").value=eyePt[2];
    
    if (document.getElementById("autoRotateY").checked ) {
        eulerY = eulerY + 0.5 ;
    }
    if (document.getElementById("autoRotateX").checked ) {
        eulerX = eulerX + 0.5 ;
    }
    
    if (document.getElementById("mountain").checked && currentMap != mountain) {
        currentMap = mountain;
        cubeLoaded = 0;
        setupTextures(currentMap);
    }
    else if (document.getElementById("beach").checked && currentMap != beach) {
        currentMap = beach;
        cubeLoaded = 0;
        setupTextures(currentMap);
    }
    else if (document.getElementById("city").checked && currentMap != city) {
        currentMap = city;
        cubeLoaded = 0;
        setupTextures(currentMap);
    }
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}