/*!
 *
 */
(function () {
  // Tool Prototype, Icon Graphic URL, Function Definition 
  canvasEditTemp = ['paint', null, toolDefinition];
  
  function toolDefinition() {
    this.cleanup = cleanup_;
    this.md = mousedown_;
    this.mm = mousemove_;
    this.mu = mouseup_;
    
    this.v['options'] = this.options[canvasEditTemp[0]];
    this.v['options']['pen_radius'] = 10;
    this.v['options']['red'] = 255;
    this.v['options']['green'] = 2;
    this.v['options']['blue'] = 4;
    this.v['options']['alpha'] = 255;
    // Variables to be cleanup
    this.v['pressed'] = false;
  }
  
  function cleanup_() {
    
  }
  
  function mousedown_(e) {
    this.v['pressed'] = true;
    
    var radius = this.v['options']['pen_radius'];
    var r = this.v['options']['red'];
    var g = this.v['options']['green'];
    var b = this.v['options']['blue'];
    var a = this.v['options']['alpha'];
    console.log(r,g,b,a);
    
    this.updateMousePos(e);
    var x = this.mouseX;
    var y = this.mouseY;
    var layer = this.layer[0];
    var width = layer.width;
    
    var xMax = x + radius;
    var xMin = x - radius;
    var j    = y + radius;
    var yMin = y - radius;
    if (xMax >= layer.width) xMax = width - 1;
    if (j >= layer.height)   j = layer.height - 1;
    if (xMin < 0) xMin = 0;
    if (yMin < 0) yMin = 0;
    
    //var pos = j * width + xMax;
    for (; j >= yMin; --j) {
      for (var i = xMax; i >= xMin; --i) {
        if ((x - i) * (x - i) + (y - j) * (y - j)  < radius * radius) {
          var pos = j * width + x;
          if (this.isInSelection(pos))
            layer.pixel(i, j, r, g, b, a);
        }
      }
    }
    layer.update();
    return false;
  }
  
  function mousemove_(e) {
    if (this.v['pressed'])
      mousedown_.call(this, e);
    return false;
  }
  
  function mouseup_(e) {
    this.v['pressed'] = false;
    
    return false;
  }
})();
