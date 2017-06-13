// NOTE: Will have to test if one can remove the event referenced by
//       canvasEdit_toolM? if canvasEdit_toolM? gets changed and references
//       a different function then after it is added to a layer

// All tools will be added to the layer itself as event handlers, thus the
// variable this refers to the layer itself

// include 'drawing.js'

// Consolidated to do list:
// - default tool options
// - test on big endian machine, especially the read pixel function
// - figure out where I want to paint selections
// - clean up floodfill, select, marching ants to be module functions
// - compare the outline algorithm with the rectangulate approach
// - fix every layer to be a cec
// - marching ants with zooming
"use strict";

var CanvasEditContext;
var ToolDatabase;
var CanvasEdit_ToolInterface;
var ANTS_SPACING = 8;

// Database is for shortcut keys and for a static indexing of the tools
// Tools are added in tools.js, shortcut keys in keys.js
(function () {
  function noop_ () {}

  function ToolEntry_(func, pic) {
    return {
      fn: func || _noop,
      graphic: pic || '',
    }
  }

  var codes_ = {
    'shift': 16, 'ctrl': 17, 'alt': 18,
    'tab': 9, 'delete': 46,
    'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70,
    'g': 71, 'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76,
    'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81, 'r': 82,
    's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88,
    'y': 89, 'z': 90,
    'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115, 'f5': 116, 'f6': 117,
    'f7': 118, 'f8': 119, 'f9': 120, 'f10':121, 'f11':122, 'f12':123,
  }
  
  ToolDatabase = function () {
    this.pressed = [];
    this.shortcuts = {};
    this.tools = {};
  
    /**
     * Adds an entry to the tool database referenceable by a string name
     * Adding tools with a duplicate name as a previous tool will overwrite it
     * @param name - a string for the tool name
     * @param graphic - undecided format for image associated with the tool
     * @param func - the function that handles all the behaviour of the tool
     *               this should set the public methods of the class: mouseup,
     *               mousemove, mousedown, and cleanup.
     **/
    var self = this;
    document.addEventListener('keydown',
      function (e) { return down_.call(self, e); });
    document.addEventListener('keyup',
      function (e) { return up_.call(self, e); });
    return this;
  }
  
  var method = ToolDatabase.prototype;

  method.addTool = function (name, graphic, func) {
    delete this.tools[name];
    this.tools[name] = ToolEntry_(func, graphic);
  };
  
  method.useTool = function (tool, client) {
    this.tools[tool].fn.call(client);
  };
  
  // Assumes <shortcut> will be given in format with no spaces:
  // <[modifier+[modifer+[modifier]]]+letter>
  // <handler> is the function for the shortcut, event object is passed
  //
  // Current implementation allows user to redefine the three modifier keys
  // which will still be referred to as shift, ctrl, alt when adding shortcuts
  // 
  // Shorcuts are stored as string of numbers, the modifier combination (3-bit
  // number) appended after the keyCode for the letter
  method.addShortcut = function (shortcut, handler) {
    this.shortcuts[decode_(shortcut)] = handler;
  };
  
  function decode_(shortcut) {
    var keys = shortcut.split('+');
    var letter = codes_[keys.pop()];
    var mod = 0;
    for (var i = keys.length - 1; i >= 0; --i) {
      if (keys[i] == 'shift') mod += 1;
      if (keys[i] == 'ctrl')  mod += 2;
      if (keys[i] == 'alt')   mod += 4;
    }
    return letter + '' + mod;
  }
    
  method.removeShortcut = function () {
  //  delete;
  };
  
  // Executes all the added shortcuts
  // Current implementation allows user to redefine the three modifier keys
  function down_(e) {
    // Don't want to execute shortcuts on hold key down events
    if (this.pressed[e.keyCode]) {
      //console.log('holding ' + e.keyCode);
      return;
    }// else {
    
    // When a new key is pressed mark that it's been pressed
    this.pressed[e.keyCode] = true;
    
    // Execute the shortcut if it exists
    // Can preventDefault() from within the handler for the shortcut
    var list = this.shortcuts;
    switch (e.keyCode) {
      case codes_['shift']: case codes_['ctrl']: case codes_['alt']: break; 
      default:
        var mod = (e.shiftKey) + (e.ctrlKey << 1) + (e.altKey << 2);
        var key = e.keyCode + '' + mod;
        if (list[key]) list[key](e);
        break;
    }
  }
  
  function up_(e) {
    this.pressed[e.keyCode] = false;
  }
})();

(function () {
  /*****************************************************************************
   * Overlay layer wrapper construction
   ****************************************************************************/
  // Will need to be updated
  CanvasEditContext = function (actual, pixels, buffer) {
    this.pixels_ = pixels;
    this.buffer = buffer;
    this.style = actual.style;
    this.ctx = actual.getContext('2d');
    
    this.updateDimensions(actual); // Sets the following three
    this.width;
    this.height;
    this.imagedata_;
  };
  
  var method = CanvasEditContext.prototype;
  
  function LittleEndianTest_() {
    var a = new ArrayBuffer(4);
    var b = new Uint8Array(a);
    var c = new Uint32Array(a);
    b[0] = 0xa1;
    b[1] = 0xb2;
    b[2] = 0xc3;
    b[3] = 0xd4;
    if(c[0] == 0xd4c3b2a1) return true; // Little
    if(c[0] == 0xa1b2c3d4) return false; // Big
    throw new Error("Something crazy just happened");
  }
  
  method.updateDimensions = function () {
    var layer = this.canvas();
    this.width = layer.width;
    this.height = layer.height;
    this.imagedata_ = this.ctx.getImageData(0, 0, layer.width, layer.height);
  }
  
  // Even though this would be so much nicer to do private, but not going to
  method.update = function () {
    this.imagedata_.data.set(this.buffer);
    this.ctx.putImageData(this.imagedata_, 0, 0);
  }
  
  // If we do drawing with canvas instead of to the buffer, have to use this
  method.updateBuffer = function () {
    this.imagedata_ = this.ctx.getImageData(0, 0, this.width, this.height);
    this.buffer.set(this.imagedata_.data);
  }
  
  method.endianTest = LittleEndianTest_;
  
  // .pixel() function
  //  Sets the rgba color of the pixel at x and y
  if (LittleEndianTest_()) {
    method.pixel = function (x, y, r, g, b, a) {
      this.pixels_[y * this.width + x] = r | (g<<8) | (b<<16) | (a<<24);
    }
    
    method.pixelI = function (i, r, g, b, a) {
      this.pixels_[i] = r | (g<<8) | (b<<16) | (a<<24);
    } 
  } else {
    method.pixel = function (x, y, r, g, b, a) {
      this.pixels_[y * this.width + x] = a | (b<<8) | (g<<16) | (r<<24);
    }
    
    method.pixelI = function (i, r, g, b, a) {
      this.pixels_[i] = a | (b<<8) | (g<<16) | (r<<24);
    } 
  }
  
  // .getPixel() function
  // NOTE: Probably going to scrap this, so you can deal with learning how
  //       to write your own getters. Perhaps also to help deal with memory
  //       leaks that would occur since this would return an [r, g, b, a] array
  //       and locally instancing arrays does that
  // NOTE2: Assuming Uint8ClampedArray is unaffected by endianness, inb4 not
  method.getPixel = function (x, y, r, g, b, a) {
    var i =  (y * this.width() + x) * 4;
    var buffer = this.buffer;
    return [buffer[i], buffer[i + 1], buffer[i + 2], buffer[i + 3]];
  }
  
  method.lineTo = function (x, y, thickness) {
  }
  
  method.rect = function (x0, y0, x1, y1, r, g, b, a) {
    var width = this.width;
    var i = y0 * width;
    for (var y = y0; y <= y1; ++y) {
      for (var x = x0; x <= x1; ++x) {
        this.pixelI(i + x, r, g, b, a);
      }
      i += width;
    }
  }
  
  // NOTE: Legacy code, to be gotten rid of, no longer doing double layer rep
  // Wrapper for the context of a canvas element in the overlay section
  // Allows both the off-screen and the display to be written to at once
  var attributes = ['fillStyle', 'canvas'];
  var methods = ['beginPath', 'closePath', 'moveTo', 'arc', 'fill', 'save',
    'restore', 'bezierCurveTo', 'stroke', 'drawImage', 'setTransform',
    'clearRect'];
  // Need to use functions since for some reason, since the array element
  // dereference doesn't propogate over to the anonymous function context when
  // in firefox, haven't tested other browsers
  function buildattributes(add) {
    CanvasEditContext.prototype[add] = function (param) {
      if (param) {
        this.ctx[add] = param;
//      this.display_[add] = param;
      }
      return this.ctx[add];
    }
  }
  function buildmethods(add) {
    CanvasEditContext.prototype[add] = function () {
      this.ctx[add].apply(this.ctx, arguments);
//      this.display_[add].apply(this.display_, arguments);
    }
  }
  for (var i = attributes.length - 1; i >= 0; --i) {
    buildattributes(attributes[i]);
  }
  for (var i = methods.length - 1; i >= 0; --i)
    buildmethods(methods[i]);
})();

(function () {
  /*****************************************************************************
   * Tool Interface
   ****************************************************************************/
  function noop_ () {}
  
  /**
   * The constructor for this class
   * @returns this - as do most constructors
   */
  CanvasEdit_ToolInterface = function (database, overlay, canvasEdit) {
    var that = this;
    this.database = database;
    this.list = [];
    this.keys = [];
    this.v = {}; // For local variable usage for tool implementations
    this.alt = false;
    this.ctrl = false;
    this.shift = false;
    this.extra = false;
    
    this.mouseX = 0;
    this.mouseY = 0;
    //this.canvasEdit_pixelData = [];
    
    this.layer = canvasEdit.activeLayer;
    this.bot = canvasEdit.stratchpad.layer;
    this.top = canvasEdit.sandbox.layer;
    this.mask = canvasEdit.mask.layer;
    //console.log(this.mask);
    
    this.options = {};
    for (var i in database.tools) {
      this.options[i] = {}; // Initialize for all made tools
    }
    
    this.cleanup = noop_;
    this.md = noop_;
    this.mm = noop_;
    this.mu = noop_;
    
    // This causes this to be assigned to the interface
    this.mousedown = function (e) { that.md(e); };
    this.mousemove = function (e) { that.mm(e); };
    this.mouseup   = function (e) { that.mu(e); };
    
    $(overlay).mousedown(this.mousedown);
    $(document).mousemove(this.mousemove);
    $(document).mouseup(this.mouseup);
    this.selection;
    this.antsOutline = [];
    this.antsOffset = -1;
    return this;
  };
  
  var method = CanvasEdit_ToolInterface.prototype;
  
  method.updateMousePos = function (e) { 
    var obj = this.container;
    //console.log(this);
    var x = e.pageX;// - this.offsetLeft;
    var y = e.pageY;// - this.offsetTop;
    
    do {
      x -= obj.offsetLeft;
      y -= obj.offsetTop;
    } while (obj = obj.offsetParent);
    
    this.mouseX = x;
    this.mouseY = y;
  };
  
  method.useTool = function (tool, options) {
    this.cleanup();
    delete this.md;
    delete this.mm;
    delete this.mu;
    if (options !== undefined) {
      this.options[tool] = options;
    }
    this.database.useTool(tool, this)
  };

  method.clear = function (cec) {
    var ctx = cec.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // The size of width and height are the same for all layers
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    cec.updateBuffer();
  };
  
  method.width = function () {
    if (this.top.canvas().width != this.bot.canvas().width)
      console.log('Width error temp layers have different widths');
    return this.top.canvas().width;
  }
  
  method.height = function () {
    if (this.top.canvas().height != this.bot.canvas().height)
      console.log('Width error temp layers have different heights');
    return this.top.canvas().height;
  }
  
  method.copyTopDown = function () {
    this.bot.drawImage(this.top.canvas(), 0, 0)
  };
  
  method.isInSelection = function (index) {
    return this.mask.buffer[index * 4 + 3] > 0;
  }
  
  //
  method.drawPath = function (path) {
    if (debug) {
      alert('what we debug things?');
    }
    
    var ctx = this.layer[0];
    // :save ctx
    ctx.beginPath();
    
    var len = path.length;
    var i = 1;
    if (len <= 0) return;
    
    ctx.moveTo(path[0]);
    while (i < len) {
      ctx.lineTO(path[i]);
      ++i;
    }
    ctx.clip();
    ctx.closePath();
    // :restore ctx
  }
  
  // Adapted from Paul Heckbert's version in "Graphics Gems", 1990
  method.floodfill = function (layer, oldX, oldY) {
    var cec = layer;
    var width = cec.width;
    var iMap = cec.pixels_;
    //console.log(iMap[15 * width + 11]);
    var start = oldY * width + oldX;
    var oldColor = iMap[start];
    var paintColor = 4270002850;
    
    // We're already done if the click target is the right color
    if (oldColor == paintColor)
      return;
    
    // each seed is [x1, x2, dy]
    var seedLines = [];
    seedLines.push([start, start, width]); // required for a special case
    
    // Keeping track of y value implicity in the <x1> and <x2>
    // Since all the y changes are just increments or decrements, can get by
    // by just adding the width and updating minX and minY
    var r = [start + width, start + width, -width]; // y += 1, dy = -1
    // represents the current seed line being scanned
    // initialized like this instead, instead of push/popping it
    
    // Loop through all the items in stack
    var left;
    do {
      var dy = r[2];
      var x1 = r[0] + dy, x2 = r[1] + dy;
      var minX = Math.floor(x1 / width) * width; 
      var maxX = minX + width; // Gotta use division cause of stack
      
      // Scan towards <minX> from <x1> and color till boundary hit
      var i = x1;
      for (; i >= minX && iMap[i] == oldColor; --i)
        iMap[i] = paintColor;
      
      // No change in position means <i> landed on border
      // This means the previous line just hit on the boundary of a hole
      // or this is traveling outside the boundaries of the intended fill
      if (i >= x1) { // Should be no > case
        // Find the first non-border point
        for (++i; i <= x2 && iMap[i] != oldColor; ++i) {}
        left = i;
        
        if (i > x2) // Jumping out of fill boundary in this case
          continue;
      
      // <i> is not on a border 
      } else {  
        left = i + 1; // currently is leftmost fillable pixel
        if (left < x1) // Leaked towards <minX>
          seedLines.push([left, x1 - 1, -dy]); // Backtrack over new region
        
        i = x1 + 1; // <left> to <x1> already filled
      }
      
      // Non-fillables break up the seedline for the next loop
      // By doing this it ensures holes arent filled because it shifts <x2>
      // till the boundary point when encountering a hole, while still moving
      // past obstructions.
      do {
        // Scan right until non-fillable
        for (; i <= maxX && iMap[i] == oldColor; ++i)
          iMap[i] = paintColor;
        seedLines.push([left, i - 1, dy]);
        
        if (i - 1 > x2)  // Leaked towards <maxX>
          seedLines.push([x2 + 1, i - 1, -dy]); // Backtrack over rew region
        
        // Navigate past the border, the non-fillable
        for (++i; i <= x2 && iMap[i] != oldColor; ++i) {}
        left = i;
        // Rerun loop starting after that border and until x2
      } while (i <= x2);
    } while (r = seedLines.pop());
    cec.update();
    //return iMap.clone();
  }
  
  // As much as I would like to make this into a more functional approach of
  // finding the corners and building the segements from that static amount, I
  // don't think it'll be more efficient in Javascript
  //
  // Probably best idea is to build <indexedList> up as a heap while adding
  // elements to it, and do heapsort. Plus heaps can be represented by arrays
  function segmentJoin_(list, check, dir, indexFunc) {
    // Index each point in <list> by their either x- or y- direction depending
    // on <dir>. Top and Bot are indexed by their y's, Left and Right by x's
    var indexedList = {};
    for (var i = list.length - 1; i >= 0; --i) {
      var p = list[i];
      var x = indexFunc(p);
      if (indexedList[x] === undefined)
        indexedList[x] = [];
      indexedList[x].push(p);
    }
    
    // Join pixels that share the same index, ensuring they form a line
    // NOTE: order reversed
    var segments = [];
    var k = -1; // index for <segments>, just the last entry of <segments>
    for (var i in indexedList) {
      var points = indexedList[i].sort(function (a, b) { return a - b; });
      var n = points.length - 2;
      segments[++k] = [points[n + 1]]; // start new segment with new array
      
      var j = 0; // Index for the new line segment being pushed into <segments>
      for (; n >= 0; --n) {
        var line = segments[k];
        // If unbroken line keep adding building up <line>, else start new
        if (line[j] - points[n] == dir) { line.push(points[n]); ++j; }
        else {                            segments[++k] = [points[n]]; j = 0; }
      }
    }
    
    // Extends each segment to include convex corners, which are missed by
    // following pixels that are in the interior instead of vertices
    var t = 0;
    for (var i = segments.length - 1; i >= 0; --i) {
      var line = segments[i];     // <dir> is always positive
      var before = line[0] + dir; // Add because sorted in reverse
      var after =  line[line.length - 1] - dir; // Likewise you subtract
      if (check(before)) { line.unshift(before); }
      if (check(after))  { line.push(after); }
    }
    return segments;
  }
    
  // <orientation> true means concave (270), false means convex (90)
  // concave turn clockwise, convex turn counter clockwise
  // [[0, -1], [1, 0]] <- clockwise, cause images suck
  function rotate_(orientation, dir, width) {
    var mag = Math.abs(dir);
    var sign = dir / mag;
    var d = mag == 1 ? [sign, 0] : [0, sign]; // [x, y]
    return orientation ? width * d[0] - d[1]: d[1] - width * d[0];
  }
  
  var CE_Path = function () {
    this.points = [];
  };
  
  CE_Path.prototype.sort = function () {
    this.points.sort();
  }
  
  CE_Path.prototype.push = function (x) {
    this.points.push(x);
  }
  
  CE_Path.prototype.shift = function (x) {
    return this.points.shift();
  }
  
  CE_Path.prototype.length = function () {
    return this.points.length;
  }
  
  CE_Path.prototype.concat = function (p) {
    var x = new CE_Path();
    x.points = this.points.concat(p.points);
    return x; 
  }
  
  CE_Path.prototype.find = function (x) {
    var limit = this.points.length;
    for (var i = 0; i < limit; ++i) {
      var cur = this.points[i];
      if (x == cur) { return true; }
      else if (x > cur) { return false; }
    }
    return false;
  }
  
  /*
  function cornerCheck(list, mask, i, x, y, color) {
    var a = mask[i + x + y] == color;
    var sum = a + (mask[i + x] == color) + (mask[i + y] == color);
    if (sum == 0 || (sum == 2 && !a))
      list.push(i);
  }
  */
  
  function cornerCheck(list, mask, i, x, y, dx, dy, w, h, color) {
    var wCheck = (0 <= x + dx) && (x + dx < w);
    var hCheck = 0 <= y + dy && y + dy < h;
    var shift = dy * h;
    var a = wCheck && hCheck && mask[i + dx + shift] == color;
    var b = wCheck && mask[i + dx] == color;
    var c = hCheck && mask[i + shift] == color;
    if ((a + b + c == 0) || (!a && b && c)) {
      list.push(i);
      //console.log(i, a, b, c, a + b + c == 0, (!a && b && c));
      //console.log(i, x, y, wCheck, hCheck);
    }
  }
  
  // This reminds of something I did in rectangulation, longest augmented path
  // NOTE: Splice while this stuff is in head does interesting things to
  //       console.log and prints the final result rather than at real time
  //
  // First entry is guarenteed to have the largest outline because it starts
  // with the lowest y, then lowest x value, then draws the outline of that
  // which is guarenteed to lie on the convex hull of the selection
  //
  // The marching ants that demarcates the selection are represented by paths of
  // pixels located on the interior of the selection as are holes
  method.select = function (mask, width, color) {
    if (width <= 0) return;
    
    /*
    // This commented section is for optimization to remove limit checking
    // from cornerCheck. NOTE: Need to add if(mask[i] == color) check to
    // everything. Additionally, needs more work to deal with 1x1, 1xn, nx1
    var corners = [];
    var i = 1;
    var w = width;
    var e = width - 1;
    var n = width - 2;
    var height = mask.length / width;
    console.log(height);
    
    cornerCheck(corners, mask, 0, +1, +w, color);
    cornerCheck(corners, mask, e, -1, +w, color);
    for (var x = n; x >= 1; --x, ++i) {
      cornerCheck(corners, mask, i, -1, +w, color);
      cornerCheck(corners, mask, i, +1, +w, color);
    }
    
    console.log(i);
    for (var y = height - 2; y >= 1; --y) {
      ++i;
      cornerCheck(corners, mask, i + 0, +1, -w, color);
      cornerCheck(corners, mask, i + 0, +1, +w, color);
      cornerCheck(corners, mask, i + e, +1, -w, color);
      cornerCheck(corners, mask, i + e, +1, +w, color);
      
      ++i;
      for (var x = n; x >= 1; --x, ++i) {
        cornerCheck(corners, mask, i, -1, -w, color);
        cornerCheck(corners, mask, i, +1, -w, color);
        cornerCheck(corners, mask, i, -1, +w, color);
        cornerCheck(corners, mask, i, +1, +w, color);
      }
    }
    
    if (height > 1) ++i;
    cornerCheck(corners, mask, i + 0, +1, -w, color);
    cornerCheck(corners, mask, i + e, -1, -w, color);
    for (var x = n; x >= 1; --x, ++i) {
      cornerCheck(corners, mask, i, -1, -w, color);
      cornerCheck(corners, mask, i, +1, -w, color);
    }
    console.log(mask.length, i);
    */
    
    
    // Identify all the corners, counts a single corner up to 4 times (as
    // would be uselful in the case of a single dot)
    var corners = [];
    var i = 0;
    var w = width;
    var h = mask.length / w;
    for (var y = 0; y < h; ++y) {
      for (var x = 0; x < w; ++x, ++i) {
        if (mask[i] == color) {
          cornerCheck(corners, mask, i, x, y, -1, -1, w, h, color);
          cornerCheck(corners, mask, i, x, y, +1, -1, w, h, color);
          cornerCheck(corners, mask, i, x, y, -1, +1, w, h, color);
          cornerCheck(corners, mask, i, x, y, +1, +1, w, h, color);
        }
      }
    }
    //console.log(corners);
    
    var outline = [];
    for (var i = corners.length; i >= 1; --i) {
      var shape = [];
      var cur = corners.shift();
      shape.push(cur);
      
      outline.push(shape);
      var dir = 1;
      //var cont = true;
      do {
        // search function
        for (var j = corners.length - 1; j >= 0; --j) {
          if (co
        }
      } while ();
    }
    
    /*
    // Now join the segments into paths
    //var border = h.concat(v);
    var outline = [];
    // I like the for loop to avoid using while inifite loops
    for (var i = h.length() + v.length(); i >= 1; --i) {
      h.sort();
      var cur = h.points.shift();
      var shape = new CE_Path();
      outline.push(shape);
      
      var dir = 1;
      var cont = true;
      do {
        --i;
        shape.push(cur);
        cur = cur + dir;
      } while (border.find(cur));
    }*/
    
    return outline;
  }
  
  method.startAnts = function (layer, oldX, oldY) {
    selectiontestimage2(layer, 0, 0);
    this.selection = this.floodfill(layer, oldX, oldY);
    
    var cec = layer;
    this.selectionLayer = cec;
    this.antsOutline = this.select(cec.pixels_, cec.width, 4270002850);
    console.log(this.antsOutline);
    
     // Test paint entire path black
    for (var i = this.antsOutline.length - 1; i >= 0; --i) {
      var path = this.antsOutline[i]; 
      for (var j = path.length - 1; j >= 0; --j) {
        cec.pixels_[path[j]] = 4278190080;
      }
    }
    cec.update();
    // */
    
    this.antsOffset = 0;
    //this.marchingAnts(false);
  }
  
  method.marchingAnts = function (oneTime) {
    // 4278190080 <=> FF000000 is black
    this.clear(this.top);
    var iMap = this.top.pixels_;
    for (var i = this.antsOutline.length - 1; i >= 0; --i) {
      var path = this.antsOutline[i];
      var limit = ANTS_SPACING % path.length;
      var d = this.antsOffset % limit;
      for (var j = path.length - 1; j >= 0; j -= limit) {
        iMap[path[j - d]]     = 4278190080;
        iMap[path[j - 1 - d]] = 4278190080;
        iMap[path[j - 2 - d]] = 4278190080;
        //iMap[path[j - 3 - d]] = 4278190080;
        
        /*
        iMap[path[j - 3 - d]] = 4294967295;
        iMap[path[j - 4 - d]] = 4294967295;
        iMap[path[j - 5 - d]] = 4294967295;
        iMap[path[j - 6 - d]] = 4294967295;
        iMap[path[j - 7 - d]] = 4294967295;*/
      }
    }
    this.top.update();
    
    var that = this;
    if (this.antsOffset >= 0 && !oneTime) {
      this.antsOffset = (this.antsOffset + 1) % ANTS_SPACING;
      //console.log(this.antsOffset);
      setTimeout(function () { that.marchingAnts(false); }, 1000);
    }
  }
})();