/*!
 *
 */
(function () {
  // Tool Prototype, Icon Graphic URL, Function Definition 
  canvasEditTemp = ['selection', 'select', toolDefinition];
  
  function toolDefinition() {
    this.cleanup = cleanup_;
    this.md = mousedown_;
    this.mm = mousemove_;
    this.mu = mouseup_;
    
    // Variables to be cleanup
    this['pressed'] = false;
  }
  
  function cleanup_() {
    
  }
  
  function mousedown_(e) {
    this.v['pressed'] = true;
    this.updateMousePos(e);
    this.v['x'] = this.mouseX;
    this.v['y'] = this.mouseY;
  }
  
  function mousemove_(e) {
    if (this.v['pressed']) {
      this.updateMousePos(e);
      var x0 = min(this.v['x'], this.mouseX);
      var y0 = min(this.v['y'], this.mouseY);
      var x1 = max(this.v['x'], this.mouseX);
      var y1 = max(this.v['y'], this.mouseY);
      
      this.clear(this.mask);
      this.mask.rect(x0, y0, x1, y1, 0, 255, 0, 255);
      this.mask.update();
    }
  }
  
  function mouseup_(e) {
    this.v['pressed'] = false;
    this.updateMousePos(e);
    var x0 = min(this.v['x'], this.mouseX);
    var y0 = min(this.v['y'], this.mouseY);
    var x1 = max(this.v['x'], this.mouseX);
    var y1 = max(this.v['y'], this.mouseY);
    this.mask.rect(x0, y0, this.mouseX, this.mouseY, 0, 255, 0, 255);
    this.mask.update();
  }
})();