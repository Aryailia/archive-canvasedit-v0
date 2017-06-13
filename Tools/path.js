(function () {
  canvasEditTemp = ['path', null, toolDefinition];
  
  // This needs to be phased out, no private variables
  var pointList_ = [];
  
  function toolDefinition() {
    this.cleanup = path_cleanup_;
    this.md = path_mousedown_;
    this.mm = path_mousemove_;
    this.mu = path_mouseup_;
    
  // Variables to be cleanup
    //this.v['previous'];
    this.v['pressed'] = false;
    this.v['dragging'] = false;
    this.v['completed'] = false;
    this.v['index'] = -1;
    this.v['pointList'] = [];
  }
  
  function path_cleanup_(e) {
    pointList_.length = 0;
    //this.v['previous'] = 
    this.v['index'] = -1;
    this.v['pressed'] = false;
    this.v['dragging'] = false;
    this.v['completed'] = false;
    
    delete this.cleanup;
    delete this.md;
    delete this.mm;
    delete this.mu;
  }
  
  function path_mousedown_(e) {
    this.options['path']();
    var len = pointList_.length;
    this.updateMousePos(e);
    // width plus height is guaranteed to be longer than every length
    var max = this.width() + this.height();
    
    if (this.v['completed']) {
    } else if (e.shiftKey) { // edit a point
      var dist = max;
      for (var i = 0; i < len; ++i) {
        var dx = pointList_[i].x - this.mouseX;
        var dy = pointList_[i].y - this.mouseY;
        var dist = dx * dx + dy * dy;
        if (d  < PEN_SNAP_TOLERANCE && d < dist)
          { dist = d; this.v['index'] = i; }
      }
     
    } else if (e.ctrlKey && len > 1) { // add a point
      var x = this.mouseX;
      var y = this.mouseY;
      var i = len - 1;
      
      for (i; i >= 1; --i) {
        var pt1 = pointList_[i - 1];
        var pt2 = pointList_[i];
        var dist = max;
        
        for (var j = 0; j < BEZIER_PRECISION; ++j) {
          var dt = j/BEZIER_PRECISION;
          var dx = x - q0(pt1.x, pt1.cp2x, pt2.cp1x, pt2.x, dt);
          var dy = y - q0(pt1.y, pt1.cp2y, pt2.cp1y, pt2.y, dt);
          var d = dx * dx + dy * dy;
          if (d < PEN_SNAP_TOLERANCE && d < dist)
            { dist = d; this.v['index'] = j; }
        }
        if (this.v['index'] != -1) break;
      }
      
      if (this.v['index'] != -1) {
        this.v['pressed'] = true;
        for (var j = len; j > i; --j)
          { pointList_[j] = pointList_[j - 1]; }
        splitCurve(i, this.v['index'] / BEZIER_PRECISION);
        this.v['index'] = i;
        paintPoint_(this.bot, pointList_[i].x,
          pointList_[i].y);
      }
    } else if (e.altKey) { // subtract a point
      alert('alt click');
      
    } else {
      var p, dx, dy; len > 2 ? (p = pointList_[0],
        dx = p.x - this.mouseX, dy = p.y - this.mouseY) : 0;
      if (len > 2 && (dx * dx + dy * dy) < PEN_SNAP_TOLERANCE) {
        var e = pointList_[len - 1];
        this.v['completed'] = true;
        this.bot.beginPath();
        this.bot.moveTo(e.x, e.y);
        this.bot.bezierCurveTo(e.cp2x, e.cp2y, p.cp1x, p.cp1y, p.x, p.y);
        this.bot.stroke();
        this.bot.closePath();
      } else {
        this.v['pressed'] = true;
        pointList_.push(new PointEntry_(this.mouseX, this.mouseY));
        if (len == 0) paintPoint_(this.bot, this.mouseX, this.mouseY);
        drawPath(this.bot, this.top, len - 1, len);
      }
    }
    return false;
  }
  
  function path_mousemove_(e) {
    this.updateMousePos(e);
    // An inbetweener has been added
    if (this.v['index'] != -1) {
      if (this.v['pressed']) {
        this.bot.clear();
        drawPath(this.bot, this.top, 0, this.v['index'] - 1, true);
        drawPath(this.bot, this.top, this.v['index'] + 1,
          pointList_.length - 1);
        this.copyTopDown();
        this.v['pressed'] = false;
      }
      this.top.clear();
      var pt = pointList_[this.v['index']];
      var dx = this.mouseX - pt.x;
      var dy = this.mouseY - pt.y;
      pt.cp1x += dx; pt.cp1y += dy;
      pt.cp2x += dx; pt.cp2y += dy;
      pt.x += dx; pt.y += dy;
      drawPath(this.top, this.top, this.v['index'] - 1, this.v['index'] + 1);
    
    } else if (this.v['pressed'] && pointList_.length > 1) {
      this.v['dragging'] = true;
      
      var p1 = pointList_[pointList_.length - 2];
      var p2 = pointList_[pointList_.length - 1];
      
      var ctx = this.top;
      this.clear(ctx);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(this.mouseX, this.mouseY,
        this.mouseX, this.mouseY, p2.x, p2.y);
      ctx.stroke();
      ctx.closePath();
    }
    return false;
  }
  
  function path_mouseup_(e) {
    if (this.v['index'] != -1) {
      this.v['index'] = -1;
    } else if (this.v['dragging']) {
      var p1 = pointList_[pointList_.length - 2];
      var p2 = pointList_[pointList_.length - 1];
      p1.cp2x = this.mouseX;
      p1.cp2y = this.mouseY;
      p2.cp1x = this.mouseX;
      p2.cp1y = this.mouseY;
    }
    this.v['pressed'] = false;
    this.v['dragging'] = false;
    this.copyTopDown();
    this.clear(this.top);
    return false;
  }
  
  /*****************************************************************************
   * Helper functions
   ****************************************************************************/
  function PointEntry_(x, y) {
    this.x = x;
    this.y = y;
    this.cp1x = x;
    this.cp1y = y;
    this.cp2x = x;
    this.cp2y = y;
  }
  
  function paintPoint_(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, PEN_POINT_RADIUS, 0, Math.PI*2, true);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
  
  // Set index to 1 to redraw everything
  function drawPath(bot, top, start, finish, paintfirst) {
    if (pointList_.length > 0) {
      var a = pointList_[start];
      paintfirst && paintPoint_(bot, a.x, a.y);
      
      var b = a;
      if (start > -1) {
        for (var i = start + 1; i <= finish; ++i) {
          a = pointList_[i - 1];
          b = pointList_[i];
          top.beginPath();
          top.moveTo(a.x, a.y);
          top.bezierCurveTo(a.cp2x, a.cp2y, b.cp1x, b.cp1y, b.x, b.y);
          top.stroke();
          top.closePath();
          paintPoint_(bot, b.x, b.y);
        }
      }
    }
    return false;
  }
  
  function q0(a, b, c, d, p) {
    var q = 1 - p, q2 = q * q;
    var p2 = p * p;
    return a*q2*q + 3*b*q2*p +3*c*q*p2 + d*p2*p;
  }

  // De Casteljau's algorithm
  function splitCurve(i, t) {
    var f = pointList_[i - 1];
    var e = pointList_[i + 1];
    var m = pointList_[i] = new PointEntry_(0, 0);
    var q = 1 - t;

    if (f.x == f.cp2x && f.y == f.cp2y && e.x == e.cp1x && e.y == e.cp2y) {
      m.cp1x = m.cp2x = m.x = f.x + Math.floor((e.x - f.x) * t);
      m.cp1y = m.cp2y = m.y = f.y + Math.floor((e.y - f.y) * t);
    } else {
    
      // Set the original control points to the first level of recursion
      var x23 = (e.cp1x - f.cp2x) * t + f.cp2x;
      var y23 = (e.cp1y - f.cp2y) * t + f.cp2y;
      f.cp2x -= Math.floor((f.cp2x - f.x) * q); // = x12
      f.cp2y -= Math.floor((f.cp2y - f.y) * q); // = y12
      e.cp1x += Math.floor((e.x - e.cp1x) * t); // = x34
      e.cp1y += Math.floor((e.y - e.cp1y) * t); // = y34
      
      // New point's control points to second level of recursion
      m.cp1x = Math.floor((f.cp2x - x23) * q + x23); //(x12, x23)
      m.cp1y = Math.floor((f.cp2y - y23) * q + y23); //(y12, y23)
      m.cp2x = Math.floor((e.cp1x - x23) * t + x23); //(x23, x34)
      m.cp2y = Math.floor((e.cp1y - y23) * t + y23); //(y23, y34)
  
      // New point's coordinates are third level of recursion
      m.x = Math.floor((m.cp2x - m.cp1x) * t + m.cp1x);
      m.y = Math.floor((m.cp2y - m.cp1y) * t + m.cp1y);
    }
  }
})();