/**
 * @fileoverview SphereMesh - A simple 3D sphere mesh for use with WebGL
 * @author Dana Sim 
 * Note: Code reused from HelloSphere code given in class
 */

// A class representing a sphere mesh
class SphereMesh {
    /**
    * Construct the mesh for the sphere
    *
    * @param Scale used to determine size of the sphere
    */
    constructor(color,mass,posX,posY,posZ,velocity) {
        // Create a place to store sphere geometry
        this.sphereVertexPositionBuffer;

        //Create a place to store normals for shading
        this.sphereVertexNormalBuffer;
        
        this.color = color;
        this.posX = posX;
        this.posY = posY;
        this.posZ = posZ;
        this.velocity = velocity;
        this.mass = mass;
        
        this.initialPos = [posX,posY,posZ];
        this.initialVel = velocity;

        this.setupBuffers();
    }
    
    /**
    * Resets parameters to initial parameters given with constructor
    */
    resetToInitial() {
        this.posX = this.initialPos[0];
        this.posY = this.initialPos[1];
        this.posZ = this.initialPos[2];
        this.velocity = this.initialVel;
    }
    
    /**
    * Return the position of the sphere
    */
    getPos() {
        return [this.posX,this.posY,this.posZ];
    }
    
    /**
    * Set the position of the sphere
    */
    setPos(newPos) {
        this.posX = newPos[0];
        this.posY = newPos[1];
        this.posZ = newPos[2];
    }
    
    /**
    * Return the color of the sphere
    */
    getColor() {
        return this.color;
    }
    
    /**
    * Return the mass of the sphere
    */
    getMass() {
        return this.mass;
    }
    
    /**
    * Return the velocity of the sphere
    */
    getVelocity() {
        return this.velocity;
    }
    
    /**
    * Return the velocity of the sphere
    */
    setVelocity(newVelocity) {
        this.velocity = newVelocity;
    }

    /**
    * Populates buffers with data for spheres
    */
    setupBuffers() {
        var sphereSoup=[];
        var sphereNormals=[];
        var numT=this.sphereFromSubdivision(6,sphereSoup,sphereNormals);
        //console.log("Generated ", numT, " triangles"); 
        this.sphereVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
        this.sphereVertexPositionBuffer.itemSize = 3;
        this.sphereVertexPositionBuffer.numItems = numT*3;
        //console.log(sphereSoup.length/9);

        // Specify normals to be able to do lighting calculations
        this.sphereVertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                      gl.STATIC_DRAW);
        this.sphereVertexNormalBuffer.itemSize = 3;
        this.sphereVertexNormalBuffer.numItems = numT*3;

        //console.log("Normals ", sphereNormals.length/3);     
    }

    /**
    * Draw the sphere
    */
    draw() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.sphereVertexPositionBuffer.itemSize, 
                             gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sphereVertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                               this.sphereVertexNormalBuffer.itemSize,
                               gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, this.sphereVertexPositionBuffer.numItems);      
    }
    
    //-------------------------------------------------------------------------
    planeFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray)
    {
        var deltaX=(maxX-minX)/n;
        var deltaY=(maxY-minY)/n;
        for(var i=0;i<=n;i++)
           for(var j=0;j<=n;j++)
           {
               vertexArray.push(minX+deltaX*j);
               vertexArray.push(maxY-deltaY*i);
               vertexArray.push(0);
           }

        for(var i=0;i<n;i++)
           for(var j=0;j<n;j++)
           {
               var vid = i*(n+1) + j;
               faceArray.push(vid);
               faceArray.push(vid+(n+1));
               faceArray.push(vid+1);

               faceArray.push(vid+1);
               faceArray.push(vid+(n+1));
               faceArray.push((vid+1) +(n+1));
           }
        //console.log(vertexArray);
        //console.log(faceArray);
    }

    //-------------------------------------------------------------------------

    pushVertex(v, vArray)
    {
     for(var i=0;i<3;i++)
     {
         vArray.push(v[i]);
     }
    }

    //-------------------------------------------------------------------------
    divideTriangle(a,b,c,numSubDivs, vertexArray)
    {
        if (numSubDivs>0)
        {
            var numT=0;
            var ab =  vec4.create();
            vec4.lerp(ab,a,b,0.5);
            var ac =  vec4.create();
            vec4.lerp(ac,a,c,0.5);
            var bc =  vec4.create();
            vec4.lerp(bc,b,c,0.5);

            numT+=divideTriangle(a,ab,ac,numSubDivs-1, vertexArray);
            numT+=divideTriangle(ab,b,bc,numSubDivs-1, vertexArray);
            numT+=divideTriangle(bc,c,ac,numSubDivs-1, vertexArray);
            numT+=divideTriangle(ab,bc,ac,numSubDivs-1, vertexArray);
            return numT;
        }
        else
        {
            // Add 3 vertices to the array

            pushVertex(a,vertexArray);
            pushVertex(b,vertexArray);
            pushVertex(c,vertexArray);
            return 1;

        }
    }

    //-------------------------------------------------------------------------
    planeFromSubdivision(n, minX,maxX,minY,maxY, vertexArray)
    {
        var numT=0;
        var va = vec4.fromValues(minX,minY,0,0);
        var vb = vec4.fromValues(maxX,minY,0,0);
        var vc = vec4.fromValues(maxX,maxY,0,0);
        var vd = vec4.fromValues(minX,maxY,0,0);

        numT+=divideTriangle(va,vb,vd,n, vertexArray);
        numT+=divideTriangle(vb,vc,vd,n, vertexArray);
        return numT;

    }

    //-----------------------------------------------------------
    sphDivideTriangle(a,b,c,numSubDivs, vertexArray,normalArray)
    {
      if (numSubDivs>0)
      {
          var numT=0;
          var ab =  vec4.create();
          vec4.lerp(ab,a,b,0.5);
          vec4.normalize(ab,ab);
          var ac =  vec4.create();
          vec4.lerp(ac,a,c,0.5);
          vec4.normalize(ac,ac);
          var bc =  vec4.create();
          vec4.lerp(bc,b,c,0.5);
          vec4.normalize(bc,bc);
          numT+=this.sphDivideTriangle(a,ab,ac,numSubDivs-1, vertexArray,normalArray);
          numT+=this.sphDivideTriangle(ab,b,bc,numSubDivs-1, vertexArray,normalArray);
          numT+=this.sphDivideTriangle(bc,c,ac,numSubDivs-1, vertexArray, normalArray);
          numT+=this.sphDivideTriangle(ab,bc,ac,numSubDivs-1, vertexArray, normalArray);
          return numT;
      }
      else
      {
          // Add 3 vertices to the array

          this.pushVertex(a,vertexArray);
          this.pushVertex(b,vertexArray);
          this.pushVertex(c,vertexArray);

          this.pushVertex(a,normalArray);
          this.pushVertex(b,normalArray);
          this.pushVertex(c,normalArray);

          return 1;
      }   
    }

    //-------------------------------------------------------------------------
    sphereFromSubdivision(numSubDivs, vertexArray, normalArray)
    {
        var numT=0;
        var a = vec4.fromValues(0.0,0.0,-1.0,0);
        var b = vec4.fromValues(0.0,0.942809,0.333333,0);
        var c = vec4.fromValues(-0.816497,-0.471405,0.333333,0);
        var d = vec4.fromValues(0.816497,-0.471405,0.333333,0);

        numT+=this.sphDivideTriangle(a,b,c,numSubDivs, vertexArray, normalArray);
        numT+=this.sphDivideTriangle(d,c,b,numSubDivs, vertexArray, normalArray);
        numT+=this.sphDivideTriangle(a,d,b,numSubDivs, vertexArray, normalArray);
        numT+=this.sphDivideTriangle(a,c,d,numSubDivs, vertexArray, normalArray);
        return numT;
    }
}
