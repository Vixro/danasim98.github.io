
/**
 * A WebGL program that draws the fighting I logo and a KH logo with special animations 
 * @author Dana Sim <danasim2@eillinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

// Matrix variable used to manipulate the image
var mvMatrix = mat4.create();

// used to make images scale
var scaleVertex = vec3.create();
var scaleSize = 1.0;
var scaleFlip = true;

// used to make images rotate
var rotAngle = 0;

// used to make the I logo "dance" like a sine wave
var sineAng = 0.0;
var sineScale = 0.5;

// used to change the background color
var backgroundColor1 = 1.0;
var backgroundColor2 = 0.0;
var colorFlip1 = true;
var colorFlip2 = true;

// used to change the crown icon color
var crownColor1 = 1;
var crownColor2 = 0;
var crownFlip1 = true;
var crownFlip2 = true;

// used to time animation
var lastTime = 0;

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

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

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}

/**
 * Populate buffers with data for the "I" logo
 *
 * We need 12 triangles to create the "I" shape. 12 triangles are used for the orange.
 * Another 12 is used to create the blue lining.
 * Therefore, there are 72 vertices for the triangles.
 */
function setupBuffersForI() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var triangleVertices = [
        //BLUE TRIANGLES
        //Note: The z-axis of 0.01 is done so that the blue triangle are BEHIND the orange ones

        // center left
        -0.35,  0.45, 0.01,
         0.35,  0.45, 0.01,
         0.35, -0.45, 0.01,

        // center right
        -0.35,  0.45, 0.01,
        -0.35, -0.45, 0.01,
         0.35, -0.45, 0.01,

        //top left
        -0.35, 0.45, 0.01,
        -0.35, 0.95, 0.01,
        -0.65, 0.45, 0.01,
        -0.35, 0.95, 0.01,
        -0.65, 0.95, 0.01,
        -0.65, 0.45, 0.01,

        //top center
        -0.35, 0.45, 0.01,
        -0.35, 0.95, 0.01,
         0.35, 0.45, 0.01,
        -0.35, 0.95, 0.01,
         0.35, 0.95, 0.01,
         0.35, 0.45, 0.01,

        //top right
         0.35, 0.45, 0.01,
         0.35, 0.95, 0.01,
         0.65, 0.45, 0.01,
         0.35, 0.95, 0.01,
         0.65, 0.95, 0.01,
         0.65, 0.45, 0.01,
      
        //bottom left
        -0.35, -0.45, 0.01,
        -0.35, -0.95, 0.01,
        -0.65, -0.45, 0.01,
        -0.35, -0.95, 0.01,
        -0.65, -0.95, 0.01,
        -0.65, -0.45, 0.01,

        //bottom center
        -0.35, -0.45, 0.01,
        -0.35, -0.95, 0.01,
         0.35, -0.45, 0.01,
        -0.35, -0.95, 0.01,
         0.35, -0.95, 0.01,
         0.35, -0.45, 0.01,

        //bottom right
         0.35, -0.45, 0.01,
         0.35, -0.95, 0.01,
         0.65, -0.45, 0.01,
         0.35, -0.95, 0.01,
         0.65, -0.95, 0.01,
         0.65, -0.45, 0.01,

        //ORANGE TRIANGLES

        // center left
        -0.3,  0.5, 0.0,
         0.3,  0.5, 0.0,
         0.3, -0.5, 0.0,

        // center right
        -0.3,  0.5, 0.0,
        -0.3, -0.5, 0.0,
         0.3, -0.5, 0.0,

        //top left
        -0.3, 0.5, 0.0,
        -0.3, 0.9, 0.0,
        -0.6, 0.5, 0.0,
        -0.3, 0.9, 0.0,
        -0.6, 0.9, 0.0,
        -0.6, 0.5, 0.0,

        //top center
        -0.3, 0.5, 0.0,
        -0.3, 0.9, 0.0,
         0.3, 0.5, 0.0,
        -0.3, 0.9, 0.0,
         0.3, 0.9, 0.0,
         0.3, 0.5, 0.0,

        //top right
         0.3, 0.5, 0.0,
         0.3, 0.9, 0.0,
         0.6, 0.5, 0.0,
         0.3, 0.9, 0.0,
         0.6, 0.9, 0.0,
         0.6, 0.5, 0.0,
      
        //bottom left
        -0.3, -0.5, 0.0,
        -0.3, -0.9, 0.0,
        -0.6, -0.5, 0.0,
        -0.3, -0.9, 0.0,
        -0.6, -0.9, 0.0,
        -0.6, -0.5, 0.0,

        //bottom center
        -0.3, -0.5, 0.0,
        -0.3, -0.9, 0.0,
         0.3, -0.5, 0.0,
        -0.3, -0.9, 0.0,
         0.3, -0.9, 0.0,
         0.3, -0.5, 0.0,

        //bottom right
         0.3, -0.5, 0.0,
         0.3, -0.9, 0.0,
         0.6, -0.5, 0.0,
         0.3, -0.9, 0.0,
         0.6, -0.9, 0.0,
         0.6, -0.5, 0.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 84; 
  
  // add blue color and orange color to buffer
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var triangleColors = [];
  var i = 0;
  for (i=0; i<42; i++) { 
      // add blue
      triangleColors.push(0.0783); 
      triangleColors.push(0.163); 
      triangleColors.push(0.29); 
      triangleColors.push(1.0); 
  }
  for (i=0; i<42; i++) {
      // add orange
      triangleColors.push(0.9); 
      triangleColors.push(0.2957); 
      triangleColors.push(0.189); 
      triangleColors.push(1.0); 
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 84;
    
  //set the background to white
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
}

/**
 * Populate buffers with data for the "crown" logo
 */
function setupBuffersForKH() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var crownVertices = [
        //Left side of crown
        0.0,  0.0, 0.0,
       -0.4, -0.2, 0.0,
       -0.3, -0.3, 0.0,
      
        0.0,  0.0, 0.0,
       -0.1,  0.1, 0.0,
       -0.4, -0.2, 0.0,
      
        0.0,  0.0, 0.0,
        0.0, -0.3, 0.0,
       -0.3, -0.3, 0.0,

        0.0,  0.0, 0.0,
       -0.2,  0.2, 0.0,
        0.0,  0.6, 0.0,
       
       -0.3, -0.3, 0.0,
       -0.4, -0.2, 0.0,
       -0.5, -0.3, 0.0,
      
       -0.2,  0.0, 0.0,
       -0.5, -0.3, 0.0,
       -0.3,  0.1, 0.0,
      
       -0.5, -0.3, 0.0,
       -0.3,  0.1, 0.0,
       -0.5,  0.3, 0.0,
      
       -0.5,  0.3, 0.0,
       -0.3,  0.1, 0.0,
       -0.3,  0.3, 0.0,
      
       -0.2,  0.2, 0.0,
       -0.3,  0.3, 0.0,
       -0.3,  0.1, 0.0,
      
       -0.3,  0.3, 0.0,
       -0.5,  0.3, 0.0,
       -0.5,  0.5, 0.0,
      
       -0.6,  0.6, 0.0,
       -0.5,  0.5, 0.0,
       -0.5, -0.3, 0.0,
      
        //Right side of crown
        0.0,  0.0, 0.0,
        0.4, -0.2, 0.0,
        0.3, -0.3, 0.0,
      
        0.0,  0.0, 0.0,
        0.1,  0.1, 0.0,
        0.4, -0.2, 0.0,
      
        0.0,  0.0, 0.0,
        0.0, -0.3, 0.0,
        0.3, -0.3, 0.0,

        0.0,  0.0, 0.0,
        0.2,  0.2, 0.0,
        0.0,  0.6, 0.0,
       
        0.3, -0.3, 0.0,
        0.4, -0.2, 0.0,
        0.5, -0.3, 0.0,
      
        0.2,  0.0, 0.0,
        0.5, -0.3, 0.0,
        0.3,  0.1, 0.0,
      
        0.5, -0.3, 0.0,
        0.3,  0.1, 0.0,
        0.5,  0.3, 0.0,
      
        0.5,  0.3, 0.0,
        0.3,  0.1, 0.0,
        0.3,  0.3, 0.0,
      
        0.2,  0.2, 0.0,
        0.3,  0.3, 0.0,
        0.3,  0.1, 0.0,
      
        0.3,  0.3, 0.0,
        0.5,  0.3, 0.0,
        0.5,  0.5, 0.0,
      
        0.6,  0.6, 0.0,
        0.5,  0.5, 0.0,
        0.5, -0.3, 0.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(crownVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 66;

  // add black color
  vertexColorBuffer = gl.createBuffer();
  var crownColors = [];
  var i = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  for (i=0; i<66; i++) {
      // black
      crownColors.push(0.0); 
      crownColors.push(0.0); 
      crownColors.push(0.0); 
      crownColors.push(1.0); 
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(crownColors), gl.DYNAMIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 66;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function drawForI() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

  mat4.identity(mvMatrix);
    
  //rotate the matrix in the X-direction
  mat4.rotateX(mvMatrix, mvMatrix, degToRad(rotAngle));
    
  //apply a scaling vertex to the matrix
  vec3.set(scaleVertex, 1.0, 1.0, 1.0);
  vec3.scale(scaleVertex,scaleVertex,scaleSize);   
  mat4.scale(mvMatrix, mvMatrix, scaleVertex); 

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

function drawForKH() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    
  //rotate the matrix in the Y-direction
  mat4.identity(mvMatrix);
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));
    
  //apply a scaling vertex to the matrix
  vec3.set(scaleVertex, 1.2, 1.2, 1.0);
  mat4.scale(mvMatrix, mvMatrix, scaleVertex); 
    
  //move the image down so it looks more centered
  mat4.translate(mvMatrix, mvMatrix, [0,-0.1,0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick for the "I" logo. Updates globals and performs animation for each tick.
 */
function animateForI() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;
        
        //changing rotation angle
        rotAngle = (rotAngle+1.0) % 360;

        //changing scale size
        if (scaleFlip) {
            scaleSize = (scaleSize - 0.005) % 1.0;
            if (scaleSize <= 0.1) {scaleFlip = false;}
        }
        else {
            scaleSize = (scaleSize + 0.005) % 1.0;
            if (scaleSize > 0.97) {scaleFlip = true;}
        }
        
        //changing sine angle
        sineAng = (sineAng + 1.0) % 360;
    }
    lastTime = timeNow; 
    
    //change the verticies in the buffer to make the triangle "dance" like a sine wave
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    var triangleVertices = [
        //BLUE TRIANGLES

        // center left
        -0.35,  0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
         0.35,  0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.35, -0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,

        // center right
        -0.35,  0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.35, -0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
         0.35, -0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,

        //top left
        -0.35, 0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.35, 0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.65, 0.45+Math.sin(degToRad(sineAng-65))*sineScale, 0.01,
        -0.35, 0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.65, 0.95+Math.sin(degToRad(sineAng-65))*sineScale, 0.01,
        -0.65, 0.45+Math.sin(degToRad(sineAng-65))*sineScale, 0.01,

        //top center
        -0.35, 0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.35, 0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
         0.35, 0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
        -0.35, 0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
         0.35, 0.95+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.35, 0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,

        //top right
         0.35, 0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.35, 0.95+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.65, 0.45+Math.sin(degToRad(sineAng+65))*sineScale, 0.01,
         0.35, 0.95+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.65, 0.95+Math.sin(degToRad(sineAng+65))*sineScale, 0.01,
         0.65, 0.45+Math.sin(degToRad(sineAng+65))*sineScale, 0.01,
      
        //bottom left
        -0.35, -0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.35, -0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.65, -0.45+Math.sin(degToRad(sineAng-65))*sineScale, 0.01,
        -0.35, -0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.65, -0.95+Math.sin(degToRad(sineAng-65))*sineScale, 0.01,
        -0.65, -0.45+Math.sin(degToRad(sineAng-65))*sineScale, 0.01,

        //bottom center
        -0.35, -0.45+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
        -0.35, -0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
         0.35, -0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
        -0.35, -0.95+Math.sin(degToRad(sineAng-35))*sineScale, 0.01,
         0.35, -0.95+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.35, -0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,

        //bottom right
         0.35, -0.45+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.35, -0.95+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.65, -0.45+Math.sin(degToRad(sineAng+65))*sineScale, 0.01,
         0.35, -0.95+Math.sin(degToRad(sineAng+35))*sineScale, 0.01,
         0.65, -0.95+Math.sin(degToRad(sineAng+65))*sineScale, 0.01,
         0.65, -0.45+Math.sin(degToRad(sineAng+65))*sineScale, 0.01,

        //ORANGE TRIANGLES

        // center left
        -0.3,  0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
         0.3,  0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,
         0.3, -0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,

        // center right
        -0.3,  0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.3, -0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
         0.3, -0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,

        //top left
        -0.3, 0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.3, 0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.6, 0.5+Math.sin(degToRad(sineAng-60))*sineScale, 0.0,
        -0.3, 0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.6, 0.9+Math.sin(degToRad(sineAng-60))*sineScale, 0.0,
        -0.6, 0.5+Math.sin(degToRad(sineAng-60))*sineScale, 0.0,

        //top center
        -0.3, 0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.3, 0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
         0.3, 0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,
        -0.3, 0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
         0.3, 0.9+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,
         0.3, 0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,

        //top right
         0.3, 0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,
         0.3, 0.9+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 
         0.6, 0.5+Math.sin(degToRad(sineAng+60))*sineScale, 0.0, 
         0.3, 0.9+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 
         0.6, 0.9+Math.sin(degToRad(sineAng+60))*sineScale, 0.0, 
         0.6, 0.5+Math.sin(degToRad(sineAng+60))*sineScale, 0.0, 
      
        //bottom left
        -0.3, -0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0, 
        -0.3, -0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.6, -0.5+Math.sin(degToRad(sineAng-60))*sineScale, 0.0,
        -0.3, -0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0, 
        -0.6, -0.9+Math.sin(degToRad(sineAng-60))*sineScale, 0.0, 
        -0.6, -0.5+Math.sin(degToRad(sineAng-60))*sineScale, 0.0, 

        //bottom center
        -0.3, -0.5+Math.sin(degToRad(sineAng-30))*sineScale, 0.0,
        -0.3, -0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0, 
         0.3, -0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 
        -0.3, -0.9+Math.sin(degToRad(sineAng-30))*sineScale, 0.0, 
         0.3, -0.9+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 
         0.3, -0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 

        //bottom right
         0.3, -0.5+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 
         0.3, -0.9+Math.sin(degToRad(sineAng+30))*sineScale, 0.0,
         0.6, -0.5+Math.sin(degToRad(sineAng+60))*sineScale, 0.0, 
         0.3, -0.9+Math.sin(degToRad(sineAng+30))*sineScale, 0.0, 
         0.6, -0.9+Math.sin(degToRad(sineAng+60))*sineScale, 0.0, 
         0.6, -0.5+Math.sin(degToRad(sineAng+60))*sineScale, 0.0, 
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 84;    
}

/**
 * Animation to be called from tick for the "crown" logo. Updates globals and performs animation for each tick.
 */
function animateForKH() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;
        
        //changing rotation angle
        rotAngle = (rotAngle+1.0) % 360;

        //changing background color between red and blue
        if (colorFlip1) {
            backgroundColor1 = (backgroundColor1 - 0.005) % 1.0;
            if (backgroundColor1 <= 0.1) {colorFlip1 = false;}
        }
        else {
            backgroundColor1 = (backgroundColor1 + 0.005) % 1.0;
            if (backgroundColor1 > 0.98) {colorFlip1 = true;}
        }
        if (colorFlip2) {
            backgroundColor2 = (backgroundColor2 + 0.005) % 1.0;
            if (backgroundColor2 > 0.98) {colorFlip2 = false;}
        }
        else {
            backgroundColor2 = (backgroundColor2 - 0.005) % 1.0;
            if (backgroundColor2 <= 0.1) {colorFlip2 = true;}
        }
        
        //changing the color for the crown
        if (crownFlip1) {
            crownColor1 = (crownColor1 - 0.005) % 1.0;
            if (crownColor1 <= 0.1) {crownFlip1 = false;}
        }
        else {
            crownColor1 = (crownColor1 + 0.005) % 1.0;
            if (crownColor1 > 0.98) {crownFlip1 = true;}
        }
        if (crownFlip2) {
            crownColor2 = (crownColor2 + 0.005) % 1.0;
            if (crownColor2 > 0.98) {crownFlip2 = false;}
        }
        else {
            crownColor2 = (crownColor2 - 0.005) % 1.0;
            if (crownColor2 <= 0.1) {crownFlip2 = true;}
        }
        
    }
    lastTime = timeNow; 
    
    //change the colors of certain vertices to create a black-white "reflection" effect
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    var crownColors = [
        //Left side of crown
        crownColor1, crownColor1, crownColor1, 1.0,
        0.0, 0.0, 0.0, 1.0,        
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,   
        0.0, 0.0, 0.0, 1.0,             
        0.0, 0.0, 0.0, 1.0,     
        
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor1, crownColor1, crownColor1, 1.0,
        
        crownColor2, crownColor2, crownColor2, 1.0,
        0.0, 0.0, 0.0, 1.0,        
        crownColor1, crownColor1, crownColor1, 1.0,
        
        0.0, 0.0, 0.0, 1.0,             
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        0.0, 0.0, 0.0, 1.0,   
        
        0.0, 0.0, 0.0, 1.0,    
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor2, crownColor2, crownColor2, 1.0,
        0.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 0.0, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,
        0.0, 0.0, 0.0, 1.0,
        crownColor1, crownColor1, crownColor1, 1.0,
        
        // Right side of crown
        crownColor1, crownColor1, crownColor1, 1.0,
        0.0, 0.0, 0.0, 1.0,        
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,   
        0.0, 0.0, 0.0, 1.0,             
        0.0, 0.0, 0.0, 1.0,     
        
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor1, crownColor1, crownColor1, 1.0,
        
        crownColor2, crownColor2, crownColor2, 1.0,
        0.0, 0.0, 0.0, 1.0,        
        crownColor1, crownColor1, crownColor1, 1.0,
        
        0.0, 0.0, 0.0, 1.0,             
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        0.0, 0.0, 0.0, 1.0,   
        
        0.0, 0.0, 0.0, 1.0,    
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        crownColor2, crownColor2, crownColor2, 1.0,
        
        crownColor2, crownColor2, crownColor2, 1.0,
        0.0, 0.0, 0.0, 1.0,
        0.0, 0.0, 0.0, 1.0,
        
        crownColor1, crownColor1, crownColor1, 1.0,
        0.0, 0.0, 0.0, 1.0,
        crownColor1, crownColor1, crownColor1, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(crownColors), gl.DYNAMIC_DRAW);
    vertexColorBuffer.itemSize = 4;
    vertexColorBuffer.numItems = 66;
}


/**
 * Startup function called from html code to start program.
 */
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    setupShaders();
    gl.enable(gl.DEPTH_TEST);
    console.log("Everything is going great!");
    tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    // display static "I"
    if (document.getElementById("staticI").checked) {
      setupBuffersForI();
      scaleSize = 1.0;
      rotAngle = 0;
      drawForI();
    }
    // animate "I"
    else if (document.getElementById("animatedI").checked) {
      setupBuffersForI();
      animateForI();
      drawForI();
    }
    // display static "crown"
    else if (document.getElementById("staticKH").checked) {
      setupBuffersForKH();
      gl.clearColor(1.0, 0.0, 0.0, 1.0);
      rotAngle = 0;
      drawForKH();
    }
    // animate "crown"
    else if (document.getElementById("animatedKH").checked) {
      setupBuffersForKH();
      //gl.clearColor(backgroundColor1, 0.0, backgroundColor2, 1.0);
      gl.clearColor(0.1167, 1.0, 0.0, 1.0);
      animateForKH();
      drawForKH();
    }
}