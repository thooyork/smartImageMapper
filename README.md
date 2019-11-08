smartImageMapper 1.2
=========

![smartimagemapper](screenshot_sim.png?raw=true "smartimagemapper")

a jQuery imagemap plugin tool to draw dynamically shapes and output the imagemaps in html, svg and JSON format.

<a href="http://www.smart-sign.com/smartimagemapper" target="_blank">demo</a>

Dependencies
------------

jQuery and <a href="https://github.com/ericdrowell/KineticJS/" target="blank">kinetic.js</a> (html5 canvas library)


Implementation
--------------

<pre>

&lt;script type="text/javascript" src="js/jquery1.11.1.min.js"&gt;&lt;/script&gt;
&lt;script type="text/javascript" src="js/kinetic.5.1.0.min.js"&gt;&lt;/script&gt;
&lt;script type="text/javascript" src="js/draggable.js"&gt;&lt;/script&gt;
&lt;script type="text/javascript" src="js/smartimagemapper.1.2.js"&gt;&lt;/script&gt;
&lt;script type="text/javascript" src="js/smartimagemapper.i18n.en_US.js"&gt;&lt;/script&gt;
&lt;script language="javascript"&gt;
  $(window).load(function(){
    var myOps = {imagePath:'images/test.jpg'};
    smartImageMap.module.init(myOps);
  });
&lt;/script&gt;
</pre>

Options
-------
<pre>
  smartImageMap.module.init({
    imagePath:'/images/myimage.jpg'                   // path to the Image mandartory
    fillColor:'rgba(0,170,234,.4)',                   // fill color of the shapes 
    strokeColor:'rgba(0,170,234,.9)',                 // stroke color of the sahpes
    fillColorHandle:'rgba(255,255,255,1)',            // fill color of the edit handle points
    strokeColorHandle:'rgba(0,170,234,1)',            // stroke color of the edit handle points
    fillColorCreate:'rgba(170,170,170,.4)',           // fill color of the shape during drawing
    strokeColorCreate:'rgba(170,170,170,.9)',         // stroke color of the shape during drawing
    fillColorHandleCreate:'rgba(255,255,255,1)',      // fill color of the edit handle during drawing
    strokeColorHandleCreate:'rgba(170,170,170,1)',    // stroke color of the edit handle during drawing
    radiusLineColor:'rgba(0,0,0,.75)',                // line color of the edit line of circle and rectangle
    centerPointFillColor:'rgba(0,0,0,.75)',           // fill color of the centerpoint of the circle during drawing
    centerPointStrokeColor:'rgba(0,0,0,1)',           // stroke color of the centerpoint of the circle during drawing
    fillColorDrag:'rgba(0,170,234,.2)',               // fill color of the shape during dragging
    strokeColorDrag:'rgba(255,153,0,.5)',             // stroke color of the shape during dragging
    maximumImageSide:900,                             // max length of either width or height of the displayed image in the tool (result imagemap will still use original w and h)
    htmlcontainer:'body'                              // container element can either be elementname like 'body', or element id like '#mycontainer' must be unique
});
</pre>

## Features
------------

- In Polygon Mode hold shift key while clicking on the line will add a new Point.
- Hold Alt Key while doubleclicking a polygon point will erase the point.

- Known issues: The calculation of the distance of the point to be added to the line, sometimes takes the wrong line as reference, this is because in the calculation the lines themselves are infinite, and thus sometimes another (not visible section of the) line is nearer to the point than the line intended. 


