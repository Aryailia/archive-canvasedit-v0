// Centralized to do list:
//  - JSON documentation
//  - lock-in to sides
//  - Link layerlist with canvas
//  - Placeholder for sortable tabs has to be floating as well
//  - On click brings window to focus in front


// include canvas.js
// include function getMouseRelativePos(mouse, relativeTo) from tool.js
var ACTIVE_TITLE_BAR_HEIGHT = 30;
var ACTIVE_TITLE_BUTTON_SIZE = 25;
var TAB_BUTTON_WIDTH = 10;
var TAB_BAR_HEIGHT = 15;
var TAB_HEAD_Y_OFFSET = ACTIVE_TITLE_BAR_HEIGHT - TAB_BAR_HEIGHT;
var TAB_HEAD_MAX_WIDTH = 120;

var CustomGUI;

(function () {
  // Width and height are for the body
  // they don't include the height of the active bar, menu, and tab bar
  var GUI_Window = function (ui, posX, posY, width, height, color) {
    this.tabList_ = [];
    
    this.width = width;
    this.height = height;
    this.posX = posX;
    this.posY = posY;
    this.ui = ui;
    this.selected = false;
    
    this.activeTab_ = -1;
    this.activeWorkspace = null;
    this.activeOverlay = null;
    
    // Create the window div
    // Wierd positioning error if you use relative
    this.get = document.createElement('div');
    var window = this.get;
    window.style.width = width + 'px';
    window.style.height =
      height + ACTIVE_TITLE_BAR_HEIGHT + TAB_BAR_HEIGHT + 'px';
    window.style.position = 'absolute';
    window.style.overflow = 'auto';
    window.style.clear = '';
    window.style.backgroundColor = color;
    window.style.left = posX + 'px';
    window.style.top = posY + 'px';
    
    // Add it to the list of windows that the document must manage
    //window.style.zIndex = ui.windows_.length;
    //ui.windows_.push(this);
    
    // Title bar
    this.titleBar = makeTitleBar_(width);
    
    // Menu

    // Tabs
    this.tabBarWrapper = makeTabWrapper_(this, window, width);
    this.tabBar = this.tabBarWrapper.headBar;
    //this.addTab('tab 012350192');
    this.addTab('tab 01235019212341923043338');
    this.addTab('tab 1');
    this.addTab('tab 2');
    
    // Append to the workflow
    window.appendChild(this.titleBar);
    window.appendChild(this.tabBarWrapper.wrapper);
    this.selectTab(0);
    ui.get.appendChild(window);
    
    $(window).draggable({
      containment: ui.get,
      handle: this.titleBar,
      stack: 'div'});
    return this;
  };
  
  var method = GUI_Window.prototype;
  
  /***
   * Important html element construction functions
   **/
  function makeContainer_(width, height, z, className) {
    var container = document.createElement('div');
    container.style.width = width;
    container.style.height = height;
    container.style.position = 'absolute';
    container.style.zIndex = z;
    //container.className = className;
    return container;
  }
  
  // Create the title bar for a window
  function makeTitleBar_(width) {
    var bar = document.createElement('div');
    //bar.style.backgroundColor = 'blue';
    bar.className = 'title-bar';
    bar.style.width = width + 'px';
    bar.style.height = ACTIVE_TITLE_BAR_HEIGHT + 'px';
    return bar;
  }
  
  
  // NOTE: jQueryUI's sortable unfortunately didn't work out for tabs
  function makeTabWrapper_(window, bodyContainer, width) {
    var wrapperWidth = width;
    var wrapperDiv = document.createElement('div');
    //wrapperDiv.style.position = 'absolute';
    wrapperDiv.style.height = TAB_BAR_HEIGHT + 'px';
    wrapperDiv.style.width = wrapperWidth + 'px';
    
    var buttonL = document.createElement('div');
    buttonL.textContent = '<';
    buttonL.style.backgroundColor = 'orange';
    buttonL.style.display = 'inline-block';
    buttonL.style.width = TAB_BUTTON_WIDTH;
    
    var buttonR = document.createElement('div');
    buttonR.textContent = '>';
    buttonR.style.backgroundColor = 'orange';
    buttonR.style.display = 'inline-block';
    buttonR.style.width = TAB_BUTTON_WIDTH;
    
    // TODO: Wtf, changing this from div to span fixes text alignment problem
    var ninja = document.createElement('span');
    ninja.style.display = 'inline-block';
    ninja.style.width = wrapperWidth - TAB_BUTTON_WIDTH * 2 + 'px';
    ninja.style.height = TAB_BAR_HEIGHT + 'px';
    //ninja.style.overflow = 'hidden';
    //ninja.style.whiteSpace = 'nowrap';
    var headBar = document.createElement('div');
    //	headBar.style.position = 'absolute';
    headBar.style.height = TAB_BAR_HEIGHT + 'px';
    headBar.style.overflowX = 'hidden';
    
    //var that = this;
    $(headBar).sortableTabbing({
      bodyContainer: bodyContainer,
      width: 40,
      left: buttonL,
      right: buttonR,
      //head: 1,
      body: function () {
        return {
          workspace:makeContainer_(window.width, window.height, 0, 'workspace'),
          overlay: makeContainer_(window.width, window.height, 1, 'overlay'),
        };
      },
      swap: {
        attach: function (container, tabBody) {
          container.appendChild(tabBody.workspace);
          container.appendChild(tabBody.overlay);
        },
        detach: function (container, tabBody) {
          container.removeChild(tabBody.workspace);
          container.removeChild(tabBody.overlay);
        }
      },
      headMaxWidth: TAB_HEAD_MAX_WIDTH,
      
      selected: function (e, tab) {
        window.activeWorkspace = tab.body.workspace;
        window.activeOverlay = tab.body.overlay;
      }
    });
    
    ninja.appendChild(headBar);
    wrapperDiv.appendChild(buttonL);
    wrapperDiv.appendChild(ninja);
    wrapperDiv.appendChild(buttonR);
    
    return {
      wrapper: wrapperDiv,
      left: buttonL,
      right: buttonR,
      headBar: headBar,
    };
  }
  
  /***
   * Tab functions
   **/
  
  method.addTab = function (title) {
    $(this.tabBar).sortableTabbing('add', {title: title});
  };
  
  // NOTE: Make sure to also update makeTabBar_, the selected arguement
  method.selectTab = function (index) {
    var $bar = $(this.tabBar);
    var tab = $bar.sortableTabbing('select', index);
    this.activeWorkspace = tab.workspace;
    this.activeOverlay = tab.overlay;
  };
  
  
  
  /***
   * Window functions
   **/
  
  // Moves this window to the front most
  method.select = function () {
    this.selected = true;
    var index = this.get.style.zIndex;
    this.ui.windows_.splice(index, 1);
    this.ui.windows_.push(this);
    for (var i = this.ui.windows_.length - 1; i >= index; --i) {
      this.ui.windows_[i].get.style.zIndex = i;
    }
  }
  
  // NOTE: Deleted a line that probably causes no issues, didn't check
  method.attachToWorkspace = function (obj, options) {
    this.content = new obj(this.activeWorkspace, this.activeOverlay,
      this.width, this.height, options);
    //this.container = //<-deleted something like this, probably no issues
    return this.content;
  };




  
  CustomGUI = function (css) {
    var that = this;
    var ui = this.get = document.createElement('div');
    this.get.className = css;
  }
  method = CustomGUI.prototype;

  method.addWindow = function (posX, posY, width, height, color) {
    return new GUI_Window(this, posX, posY, width, height, color);
  }
})();

var LayerSelect = (function () {

  function mousedown(e) {
    if ($(e.target).hasClass('press'))
      $(e.target).removeClass('press').addClass('unpress');
    else
      $(e.target).removeClass('unpress').addClass('press');
  }

  function mousemove(e) {
    $(e.target).removeClass('press unpress');
  }
  function mouseup(e, that) {
    if ($(e.target).hasClass('press')) {
      $(e.target).removeClass('press').addClass('selected');
    } else
      $(e.target).removeClass('unpress selected');
  }

  return function (workspace, overlay, width, height, canvas) {
    this.canvas = canvas;
    this.container = workspace;
    this.prevlayer = -1;
    this.prevgroup = -1;
    this.selected = [];
    this.layers_ = [];
    workspace.className += 'layer-select';
    
    var that = this;
    var len = canvas.groupCount();
    
    $(function() {
      $('.group').multisortable({
        filter: '.layer',
        connectWith: '.group',
        items: '.layer',
//        cursor: 'move',
        deselectingClass: 'ui-selecting',
        selectedClass: 'ui-selected',
        selectingClass: 'ui-selecting',
//        selectingClass: '',
        helperClass: 'ui-helper',
        order: function (from, index, group) {
          canvas.joinToGroup(group, canvas.splitGroup(from), index);
          canvas.test();
        }
      }).multiselectable('add', {
        filter: '.layer',
        connectWith: '.group',
      }, makeLayer('layer 11'));
      $('.layer-select').sortable({
        handle: '.group-name',
        items: '.group',
        helper: 'clone',
      }).disableSelection();
       
    });
    
    for (var i = 0; i < len; ++i) {
      var groupName = document.createElement('span');
      groupName.className = 'group-name';
      groupName.textContent = 'Group' + i;
      
      var group = document.createElement('div');
      group.className = 'group';
      group.appendChild(groupName);
      //$(group).sortable(layerOrderOptions);
      
      var list = canvas.getGroupInfo(i);
      var n = list.length;
      for (var j = 0; j < n; ++j) {
        var layer = makeLayer('layer' + list[j].layer.id);
        this.layers_.push('layer' + list[j].layer.id);
        group.appendChild(layer);
      }
      workspace.appendChild(group);
    }
  };

  function makeLayer(name, md, mu) {
    var layer = document.createElement('div');
    layer.className = 'layer';
        
    var handle = document.createElement('span');
    handle.className = 'layer-handle';
    handle.textContent = ' ';
        
    var title = document.createElement('span');
    title.textContent = name;
    title.className = 'layer-name';

    layer.appendChild(handle);
    layer.appendChild(title);
    return layer;
  }
})();

var ColorWheel = (function () {
  var WHEEL_SELECTOR_RADIUS = 5;
  var wheelX = 20;
  var wheelY = 10;
  var wheelRadius = 80;
  
  
  return function (workspace, overlay, width, height) {
    var wheelWidth = 200;
    var wheelHeight = 200;
    var wheel = this.wheel = document.createElement('canvas');
    wheel.width = wheelWidth;
    wheel.height = wheelHeight;
    wheel.style.position = 'absolute';
    
    var select = this.select = document.createElement('canvas');
    select.width = wheelWidth;
    select.height = wheelHeight;
    select.style.position = 'absolute';

    /*this.h = 0;
    this.s = 0;
    this.v = 255;
    this.r = 255;
    this.g = 255;
    this.b = 255;*/

    var valueSlider = document.createElement('div');
    
    drawWheel(wheel, wheelX, wheelY, wheelRadius);
    
    overlay.appendChild(select);
    workspace.appendChild(wheel);

    $(overlay).mousedown({self: this}, wheelmousedown);
  }
  
  function drawWheelSelector(ctx, x, y) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = 'black';
    ctx.arc(x, y, WHEEL_SELECTOR_RADIUS, 0, 2 * Math.PI);
    ctx.stroke()
    ctx.closePath();
  }
  
  function getMouseRelativePos(e, parent) {
    var obj = parent;
    var mouseX = e.pageX;
    var mouseY = e.pageY;
    
    do {
      mouseX -= obj.offsetLeft;
      mouseY -= obj.offsetTop;
    } while (obj = obj.offsetParent);
    return [mouseX, mouseY];
  }

  function wheelmousedown(e) {
    $(this).data('drag', true);
    var pos = getMouseRelativePos(e, this);
    var dx = pos[0] - wheelX - wheelRadius;
    var dy = pos[1] - wheelY - wheelRadius;
    var r = Math.sqrt(dx * dx + dy * dy);
    if (r < wheelRadius) {
      var color = rgb(dx, dy, r / wheelRadius, 255);
      e.data.self.r = color[0];
      e.data.self.g = color[1];
      e.data.self.b = color[2];
      
      var ctx = e.data.self.select.getContext('2d');
      drawWheelSelector(ctx, pos[0], pos[1]);
      ctx.fillStyle = 'rgb(' + color.join(',')  + ')';
      ctx.fillRect(0, 0, 20,20);
    }
  }
  
  function wheelmousemove(e) {
    if (!$(this).data('drag')) return;
    
  }
  
  
  // Many thanks to Ariya Hidayat
  // http://ariya.ofilabs.com/2011/02/color-wheel-on-canvas.html
  function rgb(dx, dy, sat, value) {
    var hue = 3 * Math.atan2(dy, dx) / Math.PI + 3;
    var h = Math.floor(hue);
    var remainder = hue - h;
          
    var u = Math.round(value * (1 - sat));
    var v = Math.round(value * (1 - sat * remainder));
    var w = Math.round(value * (1 - sat + sat * remainder));
    
    return [[value, v, u, u, w, value, value][h], // red
            [u, u, w, value, value, v, u][h],   // green
            [w, value, value, v, u, u, w][h]];  // blue
  }
  
  function convertRGBToHSV() {
  }
  
  function convertHSVToRGB() {
  }
  
  function drawWheel(canvas, startX, startY, radius) {
    var value = 255;
    var padding = 20;
    var centerX = startX + radius;
    var centerY = startY + radius;
    var width = canvas.width;
    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(width, canvas.height);
    
    var buf = new ArrayBuffer(imageData.data.length);
    var buf8 = new Uint8ClampedArray(buf);
    var data = new Uint32Array(buf);

    var radiusSquared = radius * radius;
    var xMax = centerX + radius - 1;
    var yMax = centerY + radius - 1;
    buf[1] = 0x0a0b0c0d;
    var isBigEndian = buf[4] === 0x0a;
    //buf[4] === 0x0a && buf[5] === 0x0b && buf[6] === 0x0c && buf[7] === 0x0d;

    
    if (isBigEndian) {
      for (var y = yMax, i = yMax * width; y >= startY; --y, i -= width) {
        for (var x = xMax; x >= startX; --x) {
          var dx = x - centerX;
          var dy = y - centerY;
          var r = dx * dx + dy * dy;
          
          if (r < radiusSquared) {
            var color = rgb(dx, dy, Math.sqrt(r) / radius, value);
            data[i + x] = (color[0]<<24) | (color[1]<<16) | (color[2]<<8) | 255;
          }
        }
      }
    } else {
      for (var y = yMax, i = yMax * width; y >= startY; --y, i -= width) {
        for (var x = xMax; x >= startX; --x) {
          var dx = x - centerX;
          var dy = y - centerY;
          var r = dx * dx + dy * dy;
          
          if (r < radiusSquared) {
            var color = rgb(dx, dy, Math.sqrt(r) / radius, value);
            data[i + x] = (255<<24) | (color[2]<<16) | (color[1]<<8) | color[0];
          }
        }
      }
    }

    imageData.data.set(buf8);
    ctx.putImageData(imageData, 0, 0);
  }
})();