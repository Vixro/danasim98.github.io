/**
 * @fileoverview Terrain - Generates a terrain using the diamond-square algorithm. Also creates an array of normals for each triangle in the mesh. 
 * @author Dana Sim
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain {   
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        
        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }
    
    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j)
    {
        var vid = 3*(i*(this.div+1)+j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid+1] = v[1];
        this.vBuffer[vid+2] = v[2];
    }
    
    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        var vid = 3*(i*(this.div+1)+j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid+1];
        v[2] = this.vBuffer[vid+2];
    }
    
    /**
    * Send the buffer objects to WebGL for rendering 
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
    * Render the triangles 
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
    * Render the triangle edges wireframe style 
    */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }
    
    /**
     * Fill the vertex and buffer arrays 
     */    
    generateTriangles()
    {
        var deltaX = (this.maxX-this.minX)/this.div;
        var deltaY = (this.maxY-this.minY)/this.div;

        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
                this.vBuffer.push(this.minX+deltaX*j);
                this.vBuffer.push(this.minY+deltaY*i);
                this.vBuffer.push(0);     

                this.nBuffer.push(0);
                this.nBuffer.push(0);
                this.nBuffer.push(0);
            }
        }

        for (var i = 0; i < this.div; i++) {
            for (var j = 0; j < this.div; j++) {
                var vid = i*(this.div+1)+j;

                this.fBuffer.push(vid);
                this.fBuffer.push(vid+1);
                this.fBuffer.push(vid+this.div+1);

                this.fBuffer.push(vid+1);
                this.fBuffer.push(vid+1+this.div+1);
                this.fBuffer.push(vid+this.div+1);
            }
        }

        this.numVertices = this.vBuffer.length/3;
        this.numFaces = this.fBuffer.length/3;
        
        //Implement the diamond-square algorithm and change the heights
        this.changeHeights();
        
        //Calculate the normals of each triangle to be used by shader
        this.changeNormals();
    }
    
    /**
    * Change the heights of the z vertex in triangles using the diamond-square algorithm
    */
    changeHeights() {
        //1) Initalize height of four corners to random value (between 0 and 1)
        this.vBuffer[2] = Math.random()*0.5;
        this.vBuffer[this.numVertices*3 - 1] = Math.random()*0.5;
        this.vBuffer[this.div*3 + 2] = Math.random()*0.5;
        this.vBuffer[this.numVertices*3 - 1 - this.div*3] = Math.random()*0.5;

        //Began recursion
        var roughness = 0.5;
        this.diamondAlgorithm(0,this.div,0,this.div,this.div,roughness);
    }

    /**
    * Implement the diamond-square algorithm
    * @param {number} minX the minimum x-value of the square
    * @param {number} maxX the maximum x-value of the square
    * @param {number} minY the minimum y-value of the square
    * @param {number} maxY the maximum y-value of the square
    * @param {number} recur used to calculate how many recursions are required before the square can no longer be divided into four separate pieces
    * @param {number} roughness the value that generates "roughness" in the terrain
    */ 
    diamondAlgorithm(minX,maxX,minY,maxY,recur,roughness) {
        if (recur <= 1) {
            return;
        }

        //Find the indexing of various parameters
        var midX = Math.ceil((maxX+minX)/2);
        var midY = Math.ceil((maxY+minY)/2);
        
        var botL = minY*(this.div+1)*3+minX*3+2;
        var botR = minY*(this.div+1)*3+maxX*3+2;
        var topL = maxY*(this.div+1)*3+minX*3+2;
        var topR = maxY*(this.div+1)*3+maxX*3+2;
        var center = midY*(this.div+1)*3+midX*3+2;
        
        //Add some randomness to each average calculation using roughness value
        var randomNum = roughness*Math.random()*0.8;

        //2) Diamond step
        this.vBuffer[center] = (1/4)*(this.vBuffer[botL] + this.vBuffer[botR] + this.vBuffer[topL] + this.vBuffer[topR]) + randomNum;

        //3) Square step
        this.vBuffer[minY*(this.div+1)*3+midX*3+2] = (1/3)*(this.vBuffer[center] + this.vBuffer[botR] + this.vBuffer[botL]) + randomNum; //bottom
        this.vBuffer[midY*(this.div+1)*3+minX*3+2] = (1/3)*(this.vBuffer[center] + this.vBuffer[botR] + this.vBuffer[topL]) + randomNum; //left
        this.vBuffer[maxY*(this.div+1)*3+midX*3+2] = (1/3)*(this.vBuffer[center] + this.vBuffer[topR] + this.vBuffer[topL]) + randomNum; //top
        this.vBuffer[midY*(this.div+1)*3+maxX*3+2] = (1/3)*(this.vBuffer[center] + this.vBuffer[topR] + this.vBuffer[botR]) + randomNum; //right

        //Recursively call the next diamond algorithm
        this.diamondAlgorithm(midX,maxX,midY,maxY,Math.ceil(recur/2),roughness*0.6);
        this.diamondAlgorithm(minX,midX,midY,maxY,Math.ceil(recur/2),roughness*0.6);
        this.diamondAlgorithm(midX,maxX,minY,midY,Math.ceil(recur/2),roughness*0.6);
        this.diamondAlgorithm(minX,midX,minY,midY,Math.ceil(recur/2),roughness*0.6);
    }
    
    /**
    * Calculate the normals of every triangle
    * Used in the shader program
    */ 
    changeNormals() {
        var vert1 = vec3.create();
        var vert2 = vec3.create(); 
        var vert3 = vec3.create();
        var vert4 = vec3.create();
        
        var result1 = vec3.create();
        var result2 = vec3.create();
        var normal1 = vec3.create();
        
        var result3 = vec3.create();
        var result4 = vec3.create();
        var normal2 = vec3.create();
        
        var i;
        
        /*        
        Each "square" is composed of two triangles. Loop through for each square.
        Calculate the normals of each triangle face in the square.

        3 - - 4     //Diagram to show what each vert # represents
        | \ . |
        | . \ |
        1 - - 2
        
        */
        
        for (var x = 0; x < this.div; x++) {
            for (var y = 0; y < this.div; y++) {
                
                //Get each vertex
                this.getVertex(vert1,x,y);
                this.getVertex(vert2,x,y+1);
                this.getVertex(vert3,x+1,y);
                this.getVertex(vert4,x+1,y+1);
                
                //console.log("v1.1 ",vert1[0],vert1[1],vert1[2]);
                //console.log("v1.2 ",vert2[0],vert2[1],vert2[2]);
                //console.log("v1.3 ",vert3[0],vert3[1],vert3[2]);
                
                //console.log("v2.2 ",vert2[0],vert2[1],vert2[2]);
                //console.log("v2.4 ",vert4[0],vert4[1],vert4[2]);
                //console.log("v2.3 ",vert3[0],vert3[1],vert3[2]);
                
                //Calculate the normals of each face
                vec3.sub(result1, vert2, vert4);
                vec3.sub(result2, vert3, vert4);
                vec3.cross(normal1, result2, result1);
                //console.log("normal 1 ",normal1[0],normal1[1],normal1[2]);
                vec3.sub(result3, vert4, vert2);
                vec3.sub(result4, vert3, vert2);
                vec3.cross(normal2, result4, result3);
                //console.log("normal 2 ",normal2[0],normal2[1],normal2[2]);
                
                //Add normals to each vertex involved
                i = 3*(x*(this.div+1)+y);
                this.nBuffer[i] += normal1[0];
                this.nBuffer[i+1] += normal1[1];
                this.nBuffer[i+2] += normal1[2];

                i = 3*(x*(this.div+1)+y+1);
                this.nBuffer[i] += (normal1[0] + normal2[0]);
                this.nBuffer[i+1] += (normal1[1] + normal2[1]);
                this.nBuffer[i+2] += (normal1[2] + normal2[2]);

                i = 3*((x+1)*(this.div+1)+y);
                this.nBuffer[i] += (normal1[0] + normal2[0]);
                this.nBuffer[i+1] += (normal1[1] + normal2[1]);
                this.nBuffer[i+2] += (normal1[2] + normal2[2]);
                
                i = 3*((x+1)*(this.div+1)+y+1);
                this.nBuffer[i] += normal1[0];
                this.nBuffer[i+1] += normal1[1];
                this.nBuffer[i+2] += normal1[2];                
            }
        }
        
        //Normalize the new vectors
        var oldVect = vec3.create();
        var newVect = vec3.create();
        
        for (var i=0; i<this.numVertices; i++) {
            oldVect = vec3.fromValues(this.nBuffer[i*3],this.nBuffer[i*3+1],this.nBuffer[i*3+2]);
            vec3.normalize(newVect,oldVect);
            
            this.nBuffer[i*3] = newVect[0];
            this.nBuffer[i*3+1] = newVect[1];
            this.nBuffer[i*3+2] = newVect[2];
        }
    }

    /**
     * Print vertices and triangles to console for debugging
     */
    printBuffers()
    {

        for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ", 
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");  
          }

          for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ", 
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");   
          }
    }

    /**
     * Generates line values from faces in faceArray
     * to enable wireframe rendering
     */
    generateLines()
    {
        var numTris=this.fBuffer.length/3;
        for(var f=0;f<numTris;f++)
        {
            var fid=f*3;
            this.eBuffer.push(this.fBuffer[fid]);
            this.eBuffer.push(this.fBuffer[fid+1]);

            this.eBuffer.push(this.fBuffer[fid+1]);
            this.eBuffer.push(this.fBuffer[fid+2]);

            this.eBuffer.push(this.fBuffer[fid+2]);
            this.eBuffer.push(this.fBuffer[fid]);
        }

    }
}
