// Set this to true to see all the diagonistic messages
var DEBUG = true;

  
  // Flood Fill Stuff, preparing for selection, and later tool features
  function selectiontestimage(layer, x, y) {
    var cec = layer;
    var drawingX = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7,
                    7, 8, 9,10,11,12,13,14,15,16,17,18,19,20];
    var drawingY = [20,19,18,17,16,15,14,13,12,11,10,9, 8, 7,
                    7, 6, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0];
    
    // Draw face
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(41 - drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, 41 - drawingY[i] + y, 50, 200, 20, 255);
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(41 - drawingX[i] + x, 41 - drawingY[i] + y, 50, 200, 20, 255);
    
    // Draw Left Eye
    var eyeX = [ 9, 9,10,10,11,12,13];
    var eyeY = [13,12,11,10,10, 9, 9];
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(eyeX[i] + x, eyeY[i] + y, 50, 200, 20, 255);
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(27-eyeX[i] + x, eyeY[i] + y, 50, 200, 20, 255);
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(eyeX[i] + x, 27 - eyeY[i] + y, 50, 200, 20, 255);
    for (var i = eyeX.length - 1; i >= 0; --i)
      cec.pixel(27-eyeX[i] + x,27-eyeY[i] + y, 50, 200, 20, 255);
    
    // Draw Right
    var rightX = [25,25,25,25,25,25,24,23,22];
    var rightY = [12,13,14,15,16,17,18,18,18];
    for (var i = rightX.length - 1; i >= 0; --i)
      cec.pixel(rightX[i] + x, rightY[i] + y, 50, 200, 20, 255);
    
    // Mouth
    var mouthX = [13,13,14,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29];
    var mouthY = [24,25,26,27,28,29,29,29,29,29,29,29,29,29,29,29,28,27,26];
    for (var i = mouthX.length - 1; i >= 0; --i)
      cec.pixel(mouthX[i] + x, mouthY[i] + y, 50, 200, 20, 255);
    cec.update();
    return cec;
  }

  function selectiontestimage2(layer, x, y) {
    var cec = layer;
    var drawingX = [1,1,1,1,1,1,1,1,1,2,3,4,5,6,7,8,9,9, 9, 9, 9, 9, 9, 9, 9,
                     9, 9,10,11,12,13,14,15,15,15,15,15,15,16,17,18,19,19,19,19,
                    19,19,19,19,19,20,21,22,23,23,23,23,23,23,23,23,23,23,23,23,
                    23,23,23,23,23,23,23,22,21,20,19,18,17,16,15,14,13,12,11,10,
                     9, 8, 7, 6, 5, 4, 3, 2];
    var drawingY = [1,2,3,4,5,6,7,8,9,9,9,9,9,9,9,9,9,10,11,12,13,14,15,16,17,
                    18,19,19,19,19,19,19,19,20,21,22,23,24,24,24,24,24,24,24,24,
                    23,22,21,20,19,19,19,19,19,18,17,16,15,14,13,12,11,10, 9, 8,
                     7, 6, 5, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                     1, 1, 1, 1, 1, 1, 1, 1];
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    //console.log('selectiontestimage2, drawingX.length ', drawingX.length);
    
    var lineX = [15,15,15,15,15,15,15,15];
    var lineY = [ 4, 5, 6, 7, 8, 9,10,11];
    for (var i = lineX.length - 1; i >= 0; --i)
      cec.pixel(lineX[i] + x, lineY[i] + y, 50, 200, 20, 255);
    cec.update();
    return cec;
  }
  
  function selectiontestimage3(layer, x, y) {
    var cec = layer;
    var drawingX = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    var drawingY = [0,0,0,0,0,0,0,0,0,0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    cec.update();
    return cec;
  }
  
  function selectiontestimage4(layer, x, y) {
    var cec = layer;
    var drawingX = [0,0,0,0,0,0,0,0,0,0, 0, 0, 0, 0, 0, 0, 0];
    var drawingY = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
    for (var i = drawingX.length - 1; i >= 0; --i)
      cec.pixel(drawingX[i] + x, drawingY[i] + y, 50, 200, 20, 255);
    cec.update();
    return cec;
  }