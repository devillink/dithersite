class Pyramid3D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size to window size
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Pyramid vertices in 3D space
        this.vertices = [
            // Base vertices (square)
            { x: -100, y: 100, z: -100 },
            { x: 100, y: 100, z: -100 },
            { x: 100, y: 100, z: 100 },
            { x: -100, y: 100, z: 100 },
            // Apex vertex
            { x: 0, y: -100, z: 0 }
        ];
        
        // Define faces (triangles) with vertex indices
        this.faces = [
            // Base (two triangles)
            { vertices: [0, 1, 2], color: [100, 100, 150] },
            { vertices: [0, 2, 3], color: [100, 100, 150] },
            // Side faces
            { vertices: [0, 1, 4], color: [200, 100, 100] },
            { vertices: [1, 2, 4], color: [100, 200, 100] },
            { vertices: [2, 3, 4], color: [100, 100, 200] },
            { vertices: [3, 0, 4], color: [200, 200, 100] }
        ];
        
        // Rotation angles in degrees
        this.rotationX = 30;
        this.rotationY = 45;
        this.rotationZ = 0;
        
        // Dithering level (1-5, higher = more dithering)
        this.ditherLevel = 2;
        
        // Auto rotation enabled by default
        this.autoRotate = true;
        
        // Start rendering and animation
        this.render();
        this.animate();
    }
    
    handleResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.render();
    }
    
    
    // Convert degrees to radians
    degToRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    // Rotate a point around the origin
    rotatePoint(point, rotX, rotY, rotZ) {
        const radX = this.degToRad(rotX);
        const radY = this.degToRad(rotY);
        const radZ = this.degToRad(rotZ);
        
        let { x, y, z } = point;
        
        // Rotate around X axis
        let y1 = y * Math.cos(radX) - z * Math.sin(radX);
        let z1 = y * Math.sin(radX) + z * Math.cos(radX);
        y = y1;
        z = z1;
        
        // Rotate around Y axis
        let x1 = x * Math.cos(radY) + z * Math.sin(radY);
        z1 = -x * Math.sin(radY) + z * Math.cos(radY);
        x = x1;
        z = z1;
        
        // Rotate around Z axis
        let x2 = x * Math.cos(radZ) - y * Math.sin(radZ);
        let y2 = x * Math.sin(radZ) + y * Math.cos(radZ);
        x = x2;
        y = y2;
        
        return { x, y, z };
    }
    
    // Project 3D point to 2D
    project(point) {
        const fov = 500;  // Increased FOV for closer view
        const distance = 200;  // Reduced distance for closer view
        const scale = fov / (distance + point.z);
        
        return {
            x: point.x * scale + this.width / 2,
            y: point.y * scale + this.height / 2,
            scale: scale
        };
    }
    
    // Calculate face normal for lighting
    calculateNormal(face) {
        const v1 = this.vertices[face.vertices[0]];
        const v2 = this.vertices[face.vertices[1]];
        const v3 = this.vertices[face.vertices[2]];
        
        // Calculate two edge vectors
        const edge1 = {
            x: v2.x - v1.x,
            y: v2.y - v1.y,
            z: v2.z - v1.z
        };
        
        const edge2 = {
            x: v3.x - v1.x,
            y: v3.y - v1.y,
            z: v3.z - v1.z
        };
        
        // Calculate cross product (normal)
        const normal = {
            x: edge1.y * edge2.z - edge1.z * edge2.y,
            y: edge1.z * edge2.x - edge1.x * edge2.z,
            z: edge1.x * edge2.y - edge1.y * edge2.x
        };
        
        // Normalize
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
        
        return normal;
    }
    
    // Apply Bayer matrix dithering effect
    applyDither(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Bayer matrices for different levels (2x2, 4x4, 8x8, 16x16, 32x32)
        const bayerMatrices = {
            1: [ // 2x2 matrix
                [0, 2],
                [3, 1]
            ],
            2: [ // 4x4 matrix
                [0, 8, 2, 10],
                [12, 4, 14, 6],
                [3, 11, 1, 9],
                [15, 7, 13, 5]
            ],
            3: [ // 8x8 matrix
                [0, 32, 8, 40, 2, 34, 10, 42],
                [48, 16, 56, 24, 50, 18, 58, 26],
                [12, 44, 4, 36, 14, 46, 6, 38],
                [60, 28, 52, 20, 62, 30, 54, 22],
                [3, 35, 11, 43, 1, 33, 9, 41],
                [51, 19, 59, 27, 49, 17, 57, 25],
                [15, 47, 7, 39, 13, 45, 5, 37],
                [63, 31, 55, 23, 61, 29, 53, 21]
            ],
            4: [ // 16x16 matrix (generated from 8x8)
                [0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170],
                [192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106],
                [48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154],
                [240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90],
                [12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166],
                [204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102],
                [60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150],
                [252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86],
                [3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169],
                [195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105],
                [51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153],
                [243, 115, 211, 83, 251, 123, 219, 91, 241, 113, 209, 81, 249, 121, 217, 89],
                [15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165],
                [207, 79, 239, 111, 199, 71, 231, 103, 205, 77, 237, 109, 197, 69, 229, 101],
                [63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149],
                [255, 127, 223, 95, 247, 119, 215, 87, 253, 125, 221, 93, 245, 117, 213, 85]
            ],
            5: [ // 32x32 matrix (generated from 16x16)
                [0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170, 4, 132, 36, 164, 12, 140, 44, 172, 6, 134, 38, 166, 14, 142, 46, 174],
                [192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106, 196, 68, 228, 100, 204, 76, 236, 108, 198, 70, 230, 102, 206, 78, 238, 110],
                [48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154, 52, 180, 20, 148, 60, 188, 28, 156, 54, 182, 22, 150, 62, 190, 30, 158],
                [240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90, 244, 116, 212, 84, 252, 124, 220, 92, 246, 118, 214, 86, 254, 126, 222, 94],
                [12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166, 8, 136, 40, 168, 0, 128, 32, 160, 10, 138, 42, 170, 2, 130, 34, 162],
                [204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102, 200, 72, 232, 104, 192, 64, 224, 96, 202, 74, 234, 106, 194, 66, 226, 98],
                [60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150, 56, 184, 24, 152, 48, 176, 16, 144, 58, 186, 26, 154, 50, 178, 18, 146],
                [252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86, 248, 120, 216, 88, 240, 112, 208, 80, 250, 122, 218, 90, 242, 114, 210, 82],
                [3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169, 5, 133, 37, 165, 13, 141, 45, 173, 7, 135, 39, 167, 15, 143, 47, 175],
                [195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105, 197, 69, 229, 101, 205, 77, 237, 109, 199, 71, 231, 103, 207, 79, 239, 111],
                [51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153, 53, 181, 21, 149, 61, 189, 29, 157, 55, 183, 23, 151, 63, 191, 31, 159],
                [243, 115, 211, 83, 251, 123, 219, 91, 241, 113, 209, 81, 249, 121, 217, 89, 245, 117, 213, 85, 253, 125, 221, 93, 247, 119, 215, 87, 255, 127, 223, 95],
                [15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165, 11, 139, 43, 171, 3, 131, 35, 163, 9, 137, 41, 169, 1, 129, 33, 161],
                [207, 79, 239, 111, 199, 71, 231, 103, 205, 77, 237, 109, 197, 69, 229, 101, 203, 75, 235, 107, 195, 67, 227, 99, 201, 73, 233, 105, 193, 65, 225, 97],
                [63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149, 59, 187, 27, 155, 51, 179, 19, 147, 57, 185, 25, 153, 49, 177, 17, 145],
                [255, 127, 223, 95, 247, 119, 215, 87, 253, 125, 221, 93, 245, 117, 213, 85, 251, 123, 219, 91, 243, 115, 211, 83, 249, 121, 217, 89, 241, 113, 209, 81],
                [16, 144, 48, 176, 24, 152, 56, 184, 18, 146, 50, 178, 26, 154, 58, 186, 20, 148, 52, 180, 28, 156, 60, 188, 22, 150, 54, 182, 30, 158, 62, 190],
                [208, 80, 240, 112, 216, 88, 248, 120, 210, 82, 242, 114, 218, 90, 250, 122, 212, 84, 244, 116, 220, 92, 252, 124, 214, 86, 246, 118, 222, 94, 254, 126],
                [32, 160, 0, 128, 40, 168, 8, 136, 34, 162, 2, 130, 42, 170, 10, 138, 36, 164, 4, 132, 44, 172, 12, 140, 38, 166, 6, 134, 46, 174, 14, 142],
                [224, 96, 192, 64, 232, 104, 200, 72, 226, 98, 194, 66, 234, 106, 202, 74, 228, 100, 196, 68, 236, 108, 204, 76, 230, 102, 198, 70, 238, 110, 206, 78],
                [40, 168, 8, 136, 48, 176, 16, 144, 42, 170, 10, 138, 50, 178, 18, 146, 44, 172, 12, 140, 32, 160, 0, 128, 46, 174, 14, 142, 34, 162, 2, 130],
                [232, 104, 200, 72, 240, 112, 208, 80, 234, 106, 202, 74, 242, 114, 210, 82, 236, 108, 204, 76, 224, 96, 192, 64, 238, 110, 206, 78, 226, 98, 194, 66],
                [24, 152, 56, 184, 16, 144, 48, 176, 26, 154, 58, 186, 18, 146, 50, 178, 28, 156, 60, 188, 20, 148, 52, 180, 30, 158, 62, 190, 22, 150, 54, 182],
                [216, 88, 248, 120, 208, 80, 240, 112, 218, 90, 250, 122, 210, 82, 242, 114, 220, 92, 252, 124, 212, 84, 244, 116, 222, 94, 254, 126, 214, 86, 246, 118],
                [8, 136, 40, 168, 0, 128, 32, 160, 10, 138, 42, 170, 2, 130, 34, 162, 12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166],
                [200, 72, 232, 104, 192, 64, 224, 96, 202, 74, 234, 106, 194, 66, 226, 98, 204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102],
                [56, 184, 24, 152, 48, 176, 16, 144, 58, 186, 26, 154, 50, 178, 18, 146, 60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150],
                [248, 120, 216, 88, 240, 112, 208, 80, 250, 122, 218, 90, 242, 114, 210, 82, 252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86]
            ]
        };
        
        // Get the appropriate matrix based on dither level
        const matrix = bayerMatrices[Math.min(this.ditherLevel, 5)];
        const matrixSize = matrix.length;
        const maxValue = matrixSize * matrixSize;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                // Get the threshold value from the Bayer matrix
                const matrixX = x % matrixSize;
                const matrixY = y % matrixSize;
                const threshold = matrix[matrixY][matrixX];
                
                // Process each color channel
                for (let c = 0; c < 3; c++) {
                    const pixel = data[idx + c];
                    // Scale the threshold to match the color range (0-255)
                    const scaledThreshold = (threshold / maxValue) * 255;
                    // Apply dithering
                    data[idx + c] = pixel > scaledThreshold ? 255 : 0;
                }
            }
        }
        
        return imageData;
    }
    
    // Draw a triangle face
    drawTriangle(face, projectedVertices) {
        const v1 = projectedVertices[face.vertices[0]];
        const v2 = projectedVertices[face.vertices[1]];
        const v3 = projectedVertices[face.vertices[2]];
        
        // Calculate lighting based on face normal
        const normal = this.calculateNormal(face);
        const lightDir = { x: 0, y: -1, z: 1 };
        
        // Normalize light direction
        const lightLength = Math.sqrt(lightDir.x * lightDir.x + lightDir.y * lightDir.y + lightDir.z * lightDir.z);
        lightDir.x /= lightLength;
        lightDir.y /= lightLength;
        lightDir.z /= lightLength;
        
        // Calculate dot product for lighting
        const dotProduct = normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z;
        const brightness = Math.max(0.3, Math.min(1, dotProduct));
        
        // Apply brightness to face color
        const color = face.color.map(c => Math.floor(c * brightness));
        
        // Create a temporary canvas for the triangle
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw filled triangle
        tempCtx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        tempCtx.beginPath();
        tempCtx.moveTo(v1.x, v1.y);
        tempCtx.lineTo(v2.x, v2.y);
        tempCtx.lineTo(v3.x, v3.y);
        tempCtx.closePath();
        tempCtx.fill();
        
        // Get image data and apply dithering
        const imageData = tempCtx.getImageData(0, 0, this.width, this.height);
        const ditheredImage = this.applyDither(imageData);
        
        // Put the dithered image back
        this.ctx.putImageData(ditheredImage, 0, 0);
    }
    
    // Render the pyramid
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Rotate and project vertices
        const rotatedVertices = this.vertices.map(vertex => 
            this.rotatePoint(vertex, this.rotationX, this.rotationY, this.rotationZ)
        );
        
        const projectedVertices = rotatedVertices.map(vertex => 
            this.project(vertex)
        );
        
        // Sort faces by average Z depth (painter's algorithm)
        const sortedFaces = [...this.faces].sort((a, b) => {
            const avgZA = a.vertices.reduce((sum, idx) => sum + rotatedVertices[idx].z, 0) / a.vertices.length;
            const avgZB = b.vertices.reduce((sum, idx) => sum + rotatedVertices[idx].z, 0) / b.vertices.length;
            return avgZA - avgZB;
        });
        
        // Draw faces
        sortedFaces.forEach(face => {
            this.drawTriangle(face, projectedVertices);
        });
    }
    
    // Animation loop for auto-rotation
    animate() {
        if (!this.autoRotate) return;
        
        this.rotationY = (this.rotationY + 1) % 360;
        
        this.render();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the pyramid when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new Pyramid3D('pyramid-canvas');
});