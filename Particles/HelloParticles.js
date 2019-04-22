
/**
 * @file A WebGL program rendering a simple particle system 
 * @author Eric Shaffer and Dana Sim 
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global Simple GLSL shader program */
var shaderProgram;
var shaderProgramPhong;
var shaderProgramSkybox;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global Objects holding the geometry for 3D meshes */
var myCube;     
var numSpheres = 10;
var mySpheres = new Array(numSpheres);

/** @global Parameters for invisible "box" particles are within */
var boxSize = 20; 

// Euler Integration and Forces parameters
var gravity = 10;
var acceleration = [0,-1*gravity,0];
var drag = 1;
var friction = [0.8,0.8,0.8];
var startTime = 0;
var elapsedTime = 0;

// used to make model scale
var scaleVertex = vec3.create();

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0,0,10);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0,0,20];
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

/** @global Array to hold currently pressed key */
var currentlyPressedKeys = {};

//Texture parameters for cube map
var cubeImage = new Array(6);
var cubeTexture;
var cubeLoaded = 0; //keep track of how many textures were loaded

//Different skyboxes to use
var city = [
    'images/city/pos-x.jpg',
    'images/city/neg-x.jpg',
    'images/city/pos-y.jpg',
    'images/city/neg-y.jpg',
    'images/city/pos-z.jpg',
    'images/city/neg-z.jpg'
];
var mountain = [
    'images/mountain/pos-x.jpg',
    'images/mountain/neg-x.jpg',
    'images/mountain/pos-y.jpg',
    'images/mountain/neg-y.jpg',
    'images/mountain/pos-z.jpg',
    'images/mountain/neg-z.jpg'
];
var beach = [
    'images/beach/pos-x.jpg',
    'images/beach/neg-x.jpg',
    'images/beach/pos-y.jpg',
    'images/beach/neg-y.jpg',
    'images/beach/pos-z.jpg',
    'images/beach/neg-z.jpg'
];
var nullMap = [
    'images/blank/pos-x.jpg',
    'images/blank/neg-x.jpg',
    'images/blank/pos-y.jpg',
    'images/blank/neg-y.jpg',
    'images/blank/pos-z.jpg',
    'images/blank/neg-z.jpg'
];
var currentMap = nullMap;

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
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
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

//-----------------------------------------------------------------
//Color conversion  helper functions
function hexToR(h) {return parseInt((cutHex(h)).substring(0,2),16)}
function hexToG(h) {return parseInt((cutHex(h)).substring(2,4),16)}
function hexToB(h) {return parseInt((cutHex(h)).substring(4,6),16)}
function cutHex(h) {return (h.charAt(0)=="#") ? h.substring(1,7):h}


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
 * Setup the fragment and vertex shaders to be used with the sphere (phong)
 */
function setupShadersPhong() {
  vertexShader = loadShaderFromDOM("shader-blinn-phong-vs");
  fragmentShader = loadShaderFromDOM("shader-blinn-phong-fs");
  
  shaderProgramPhong = gl.createProgram();
  gl.attachShader(shaderProgramPhong, vertexShader);
  gl.attachShader(shaderProgramPhong, fragmentShader);
  gl.linkProgram(shaderProgramPhong);

  if (!gl.getProgramParameter(shaderProgramPhong, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  //gl.useProgram(shaderProgramPhong);

  shaderProgramPhong.vertexPositionAttribute = gl.getAttribLocation(shaderProgramPhong, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramPhong.vertexPositionAttribute);

  shaderProgramPhong.vertexNormalAttribute = gl.getAttribLocation(shaderProgramPhong, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgramPhong.vertexNormalAttribute);

  shaderProgramPhong.mvMatrixUniform = gl.getUniformLocation(shaderProgramPhong, "uMVMatrix");
  shaderProgramPhong.pMatrixUniform = gl.getUniformLocation(shaderProgramPhong, "uPMatrix");
  shaderProgramPhong.nMatrixUniform = gl.getUniformLocation(shaderProgramPhong, "uNMatrix");

  shaderProgramPhong.uniformLightPositionLoc = gl.getUniformLocation(shaderProgramPhong, "uLightPosition");  
  shaderProgramPhong.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgramPhong, "uAmbientLightColor");  
  shaderProgramPhong.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgramPhong, "uDiffuseLightColor");
  shaderProgramPhong.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgramPhong, "uSpecularLightColor");
  shaderProgramPhong.uniformShininessLoc = gl.getUniformLocation(shaderProgramPhong, "uShininess");    
  shaderProgramPhong.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgramPhong, "uKAmbient");  
  shaderProgramPhong.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgramPhong, "uKDiffuse");
  shaderProgramPhong.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgramPhong, "uKSpecular");
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

  shaderProgramSkybox.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSkybox, "aVertexPosition");
  //console.log("Vertex attrib: ", shaderProgramSkybox.vertexPositionAttribute);
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
    //if (img[0] != null) {
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
 * Populate buffers with data - Cube Mesh
 */
function setupCube() {
  myCube = new CubeMesh(200);
}

/**
 * Populate buffers with data - Sphere Mesh
 */
function setupSphere() {
    for (var i = 0; i<numSpheres; i++) {
        var sphereColor = [Math.random(),Math.random(),Math.random()];
        var sphereMass = 1.0;
        var sphereXPos = Math.random()*boxSize - boxSize/2;
        var sphereYPos = Math.random()*boxSize - boxSize/2;
        var sphereZPos = Math.random()*boxSize - boxSize/2;
        var sphereVelocity = [Math.random()*100-50,Math.random()*100-50,Math.random()*100-50];
        mySpheres[i] = new SphereMesh(sphereColor,sphereMass,sphereXPos,sphereYPos,sphereZPos,sphereVelocity);
    }
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
    drawSphere();
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
 * Draw a sphere based on buffers
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function drawSphere() {
    //console.log("function drawMesh()");
    
    gl.useProgram(shaderProgramPhong);
    shaderProgram = shaderProgramPhong;
   
    //ensure light is in proper direction
    mvPushMatrix();
    mat4.multiply(mvMatrix,vMatrix,mvMatrix);
    setMatrixUniforms();
    vec3.transformMat4(worldLightPosition, lightPosition, mvMatrix);
    setLightUniforms(worldLightPosition,lAmbient,lDiffuse,lSpecular);
    mvPopMatrix();

    //draw spheres once background is loaded in
    if (cubeLoaded == 6) {
        for (var i = 0; i<numSpheres; i++) {
            //Now draw sphere
            mvPushMatrix();
            vec3.set(scaleVertex, 1.0, 1.0, 1.0);
            vec3.scale(scaleVertex,scaleVertex,0.2);   
            mat4.scale(mvMatrix, mvMatrix, scaleVertex);
            mat4.translate(mvMatrix,mvMatrix,mySpheres[i].getPos());
            mat4.multiply(mvMatrix,vMatrix,mvMatrix);
            setMatrixUniforms();
            if (document.getElementById("random-color").checked) {
                setMaterialUniforms(shininess,kAmbient,mySpheres[i].getColor(),kSpecular); 
            }
            else {
                //Get material color
                var colorVal = document.getElementById("mat-color").value
                var R = hexToR(colorVal)/255.0;
                var G = hexToG(colorVal)/255.0;
                var B = hexToB(colorVal)/255.0;
                console.log("Color set to ", R, G, B);
                setMaterialUniforms(shininess,kAmbient,[R,G,B],kSpecular); 

            }
            mySpheres[i].draw();
            mvPopMatrix();
        }
    }
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
        //console.log("Key down ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = true;
    
        //Add or remove spheres
        if (currentlyPressedKeys["p"]) {
            console.log("Added particle!");
            event.preventDefault();
            numSpheres+=1;
            var sphereColor = [Math.random(),Math.random(),Math.random()];
            var sphereMass = 1.0;
            var sphereXPos = Math.random()*boxSize - boxSize/2;
            var sphereYPos = Math.random()*boxSize - boxSize/2;
            var sphereZPos = Math.random()*boxSize - boxSize/2;
            var sphereVelocity = [Math.random()*100-50,Math.random()*100-50,Math.random()*100-50];
            mySpheres.push(new SphereMesh(sphereColor,sphereMass,sphereXPos,sphereYPos,sphereZPos,sphereVelocity));
        } else if (currentlyPressedKeys["o"]) {
            console.log("Removed particle!");
            event.preventDefault();
            numSpheres-=1;
        } 
    
        //reset to 10 spheres
        if (currentlyPressedKeys["t"]) {
            console.log("Reset to 10 particles!");
            event.preventDefault();
            numSpheres = 10;
        }
    
        //change drag
        if (currentlyPressedKeys["l"]) {
            console.log("Decreased drag!");
            event.preventDefault();
            drag+= 0.01;
        } else if (currentlyPressedKeys["k"]) {
            console.log("Increased drag!");
            event.preventDefault();
            drag-= 0.01;
        } 
    
        //reset to initial parameters
        if (currentlyPressedKeys["r"]) {
            console.log("Reset!");
            event.preventDefault();
            numSpheres = 10;
            drag = 1;
            for (var i = 0; i<numSpheres; i++) {
                mySpheres[i].resetToInitial();
            }
            document.getElementById("random-color").checked = true;
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
     
    //setup box
    setupTextures(nullMap); 
    setupCube();
    setupShadersCube();
     
    //setup spheres
    setupSphere();
    setupShadersPhong();
     
    startTime = Date.now();
    tick();
}

//----------------------------------------------------------------------------------
/**
  * Update any transformations
  */
function animate() {    
    //Update particles position and velocity
    elapsedTime = (Date.now() - startTime)/1000;
    for (var i = 0; i<numSpheres; i++) {
        var oldPos = mySpheres[i].getPos();
        var oldVel = mySpheres[i].getVelocity();
        var newPosition = [];
        var newVelocity = [];
        for (var j = 0; j<3; j++) {
            var nextPos = oldPos[j] + oldVel[j]*elapsedTime;
            var nextVel = oldVel[j]*(drag**elapsedTime) + acceleration[j]*elapsedTime;
            //check for wall collisions
            if (Math.abs(nextPos) > boxSize/2) {
                nextPos = oldPos[j] - oldVel[j]*elapsedTime;
                nextVel = (oldVel[j]*friction[j] + acceleration[j]*elapsedTime)*-1;
            }
            newPosition.push(nextPos);
            newVelocity.push(nextVel);
        }
        mySpheres[i].setPos(newPosition);
        mySpheres[i].setVelocity(newVelocity);
    }
    startTime = Date.now();
    
    //update UI
    document.getElementById("sphereCount").value=numSpheres;
    document.getElementById("drag").value = drag;

    //Check if background changed
    if (document.getElementById("blank").checked && currentMap != nullMap) {
        currentMap = nullMap;
        cubeLoaded = 0;
        setupTextures(currentMap);
    }
    else if (document.getElementById("mountain").checked && currentMap != mountain) {
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