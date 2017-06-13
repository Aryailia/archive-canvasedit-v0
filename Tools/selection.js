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
    this.updateMousePos(e);
    if (this.v['pressed']) {
      var x0 = Math.min(this.v['x'], this.mouseX);
      var y0 = Math.min(this.v['y'], this.mouseY);
      var x1 = Math.max(this.v['x'], this.mouseX);
      var y1 = Math.max(this.v['y'], this.mouseY);
      
      this.clear(this.bot);
      this.bot.rect(x0, y0, x1, y1, 0, 255, 0, 255);
      this.bot.update();
    }
  }
  
  function mouseup_(e) {
    if (this.v['pressed']) {
      var x0 = Math.min(this.v['x'], this.mouseX);
      var y0 = Math.min(this.v['y'], this.mouseY);
      var x1 = Math.max(this.v['x'], this.mouseX);
      var y1 = Math.max(this.v['y'], this.mouseY);
      
      var width = this.mask.width;
      /*var i = y1 * width + x1;
      var path = [];
      for (var y = y1; y >= y0; --y) { path.push(i -= width); }
      for (var x = x1; x >= x0; --x) { path.push(i -= 1); }
      for (var y = y1; y >= y0; --y) { path.push(i += width); }
      for (var x = x1; x >= x0; --x) { path.push(i += 1); }
      this.antsOutline.push(path);*/
      
      this.mask.rect(x0, y0, x1, y1, 0, 0, 0, 255);
      this.antsOutline = 
this.select(this.mask.pixels_, this.mask.width, 4278190080);
      //this.marchingAnts(true);
      this.clear(this.bot);
      this.v['pressed'] = false;
    }
  }
})();