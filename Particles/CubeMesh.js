/**
 * @fileoverview CubeMesh - A simple 3D cube mesh for use with WebGL
 * @author Dana Sim
 */

// A class representing a cube mesh
class CubeMesh {
  /**
   * Construct the mesh for the cube
   *
   * @param Scale used to determine size of the cube
   */
  constructor(scale) {
    // Create a place to store the texture coords for the mesh
    this.cubeTCoordBuffer;

    // Create a place to store terrain geometry
    this.cubeVertexBuffer;

    // Create a place to store the triangles
    this.cubeTriIndexBuffer;
      
    // Scale size of cube  
    this.scale = scale;
      
    this.setupBuffers();
  }

  // set up buffers for drawing
  setupBuffers() {
      // Create a buffer for the cube's vertices.
      this.cubeVertexBuffer = gl.createBuffer();

      // Select the cubeVerticesBuffer as the one to apply vertex
      // operations to from here out.

      gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVertexBuffer);

      // Now create an array of vertices for the cube.

      var vertices = [
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,

        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,

        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
      ];
      
      var scale = this.scale;
      vertices = vertices.map(function(x) { return x * scale; });

      // Now pass the list of vertices into WebGL to build the shape. We
      // do this by creating a Float32Array from the JavaScript array,
      // then use it to fill the current vertex buffer.

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      // Map the texture onto the cube's faces.

      this.cubeTCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeTCoordBuffer);

      var textureCoordinates = [
        // Front
        0.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        // Back
        0.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        // Top
        0.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        // Bottom
        0.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        // Right
        0.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0,
        // Left
        0.0,  0.0,
        0.0,  1.0,
        1.0,  1.0,
        1.0,  0.0
      ];

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                    gl.STATIC_DRAW);

      // Build the element array buffer; this specifies the indices
      // into the vertex array for each face's vertices.

      this.cubeTriIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeTriIndexBuffer);

      // This array defines each face as two triangles, using the
      // indices into the vertex array to specify each triangle's
      // position.

      var cubeVertexIndices = [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23    // left
      ];

      // Now send the element array to GL

      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
          new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    }

  /**
   * Draw the cube
   */
  draw() {
    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the texture coordinates attribute for the vertices.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeTCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

    // Specify the texture to map onto the faces.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

    // Draw the cube.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeTriIndexBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }
}
