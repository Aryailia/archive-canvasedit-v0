

/**
 * The free draw tool
 */
(function () {
  // Variables to be cleanup
  var pressed_ = false;
  var size_ = 10;
  
  
  // Variables to be defined at runtime
  var that, ctx;
  var previousX_;
  var previousY_;
  
  CanvasEdit_ToolDatabase.addTool('free draw', 'null', function () {
    that = this;
    ctx = this.bot;
    
    this.cleanup = freedraw_cleanup_;  
    this.md = freedraw_mousedown_;
    this.mm = freedraw_mousemove_;
    this.mu = freedraw_mouseup_;
  });
  
  function freedraw_cleanup_(e) {
    //previous_ = 
    pressed_ = false;
    
    delete that.cleanup;
    delete that.md;
    delete that.mm;
    delete that.mu;
  }

  function freedraw_mousedown_(e) {
    ctx.fillStyle("rgba(0,55,0,0.05)");
    that.updateMousePos(e);
    previousX_ = that.mouseX;
    previousY_ = that.mouseY;
    // position updated in mousemove
    pressed_ = true;
    return false;
  }

  function freedraw_mousemove_(e) {
    // Gets the mouse position relative to the div container
    that.updateMousePos(e);
    
    if (pressed_) {
      var dx = that.mouseX - previousX_;
      var dy = that.mouseY - previousY_;
      var len = Math.floor(Math.sqrt(dx * dx + dy * dy));
      for (var i = len; i >= 1; --i) {
        var x = Math.floor(previousX_ + dx * i / len);
        var y = Math.floor(previousY_ + dy * i / len);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, 10, 0, Math.PI*2, true);
        ctx.fill();
        ctx.closePath();
      }
      
      previousX_ = that.mouseX;
      previousY_ = that.mouseY;
    }
    return false;
  }

  function freedraw_mouseup_(e) {
    pressed_ = false;
    return false;
  }
})();