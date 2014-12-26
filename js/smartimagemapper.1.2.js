/*
Copyright (C) 2014 ~ @thooyork 

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version, as long as you leave this note in here.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

var smartImageMap = {};

var ____lang = {};

smartImageMap.module = (function(options){

	var settings,
		that,
		stage,
		shapeslayer,
		imagelayer,
		radiuslayer,
		editlayer,
		drawnewhandlelayer,
		drawnewshapelayer,
		currentmode,
		newpointsAry,
		lastAddedPoint,
		minificationFactor,
		originalImageWidth,
		originalImageHeight,
		imagemapObj,
		htmlcontainer;

	var defaults = {
		fillColor:'rgba(0,170,234,.4)',
		strokeColor:'rgba(0,170,234,.9)',
		fillColorHandle:'rgba(255,255,255,1)',
		strokeColorHandle:'rgba(0,170,234,1)',
		fillColorCreate:'rgba(170,170,170,.4)',
		strokeColorCreate:'rgba(170,170,170,.9)',
		fillColorHandleCreate:'rgba(255,255,255,1)',
		strokeColorHandleCreate:'rgba(170,170,170,1)',
		radiusLineColor:'rgba(0,0,0,.75)',
		centerPointFillColor:'rgba(0,0,0,.75)',
		centerPointStrokeColor:'rgba(0,0,0,1)',
		fillColorDrag:'rgba(0,170,234,.2)',
		strokeColorDrag:'rgba(255,153,0,.5)',
		maximumImageSide:900,
		htmlcontainer:'body'
	};

	shapeslayer = new Kinetic.Layer();
	editlayer = new Kinetic.Layer();
	radiuslayer = new Kinetic.Layer();
	drawnewhandlelayer = new Kinetic.Layer();
	drawnewshapelayer = new Kinetic.Layer();

	newpointsAry = [];
	minificationFactor = 1;


	var storeItem = function(key, val){
		localStorage.setItem(key, val);
		$('#' + key).val(val);
	};

	var readItem = function(key){
		var areaVal = localStorage.getItem(key);
		//var areaVal = $('#' + key).val();
		$('#' + key).val(areaVal);

		try{
			areaVal = JSON.parse(areaVal);
		}
		catch(err){
			areaVal = {};
		}
		return areaVal;
	};


	/* ##### ##### ##### ##### ##### ##### ##### ##### EVENTHANDLER FUNCTIONS ##### ##### ##### ##### ##### ##### ##### ##### */
	var handlerShape = function(hotspotObj, shapeObj){
		return function(){

			if(currentmode == "selection"){
				displayPopertyPanel(hotspotObj);
				editCurrentHotspot(hotspotObj);
				shapeObj.setFill(settings.fillColorDrag);
			}
		}
	};

	var handlerShapeMouseup = function(hotspotObj, shapeObj){
		return function(){
			//if(currentmode == "selection"){
				shapeObj.setFill(settings.fillColor);
			//}
		}
	};

	var handlerSaveHotspot = function(hotspotObj){
		return function(e){
			hotspotObj.shape.coords = convertCommaStringToArray($('#area').val());
			hotspotObj.name = $('#name').val();
			hotspotObj.link = $('#link').val();
			hotspotObj.target = $('#target').val();
			hotspotObj.events.mouseover = $('#mouseover').val();
			hotspotObj.events.mouseout = $('#mouseout').val();
			hotspotObj.events.click = $('#click').val();

			editCurrentHotspot(hotspotObj);
			drawHotspots();

			storeItem('imagemap', JSON.stringify(imagemapObj));

			smartImageMap.module.setMode("selection");
		}
	};

	var handlerDeleteHotspot = function(hotspotObj){
		return function(e){
			if(confirm(translate('Diesen Hotspot löschen ?'))){
				deleteHotspot(hotspotObj);
			}
		}
	};

	var handlerDeleteAllHotspots = function(){
		return function(e){
			if(confirm(translate('Alle Hotspots löschen ?'))){
				clearPopertyPanel();
				clearHandles();
				imagemapObj.imagemap.hotspots = [];
				drawHotspots();
				//storeItem('hotspots', JSON.stringify(hotspots));
				storeItem('imagemap', JSON.stringify(imagemapObj));
			}
			smartImageMap.module.setMode("selection");
		}
	};

	var handlerCreateOutput = function(){
		return function(e){
			var format,
				theHtml,
				oContainer;

			$('#propertypanel').hide();
			smartImageMap.module.setMode("selection");
			format = $(this).attr('id');
			oContainer = $('#outputcontainer');
			theHtml = '<div class="draghandle"><h2>' + translate('Ausgabe') + ' ['+format +']<span id="closemap">X</span></h2></div><textarea name="output" id="output" class="output"></textarea>';
			oContainer.html('').append(theHtml).show();

			createoutput(format);
			oContainer.drags({handle:'.draghandle',cursor:'pointer'});

			$('#closemap').on('click',function(){
				oContainer.hide();
			});
		}
	};

	
	/* ##### ##### ##### ##### ##### ##### ##### ##### EXISTING SHAPES EVENTHANDLER ##### ##### ##### ##### ##### ##### ##### ##### */
	//Einzelner Punkt des Polygons im Editmode
	var handlerPolygonHandleDragend = function(point, hotspotObj){
		return function(e){
			displayPopertyPanel(hotspotObj);
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};

	//Einzelner Punkt des Polygons im Editmode
	var handlerPolygonHandleMousemove = function(point, hotspotObj){
		var oldX, oldY, newX, newY;

		oldX = point.getX();
		oldY = point.getY();

		return function(e){
			 newX = point.getX();
			 newY = point.getY();

			for (var i=0; i<hotspotObj.shape.coords.length;i++){
				if(oldX === hotspotObj.shape.coords[i] && oldY === hotspotObj.shape.coords[i+1]){
					hotspotObj.shape.coords[i] = newX;
					hotspotObj.shape.coords[i+1] = newY;
				}
			}
			oldX = newX;
			oldY = newY;

			shapeslayer.batchDraw();
			//drawHotspots();
		}

	};

	//Ganzes Polygon im Editmode:
	var handlerDragendPolygon = function(hotspotObj){
		return function(e){
			var points = this.getPoints();

			// this.getPoints() liefert immer das urspruengliche Punkte Array, nicht das NACH dem dragend
			// daher muessen die punkte einzeln ueber getAbsolutePosition() im loop korrigiert werden.
			for (var i=0; i<points.length;i++){
				if(isEven(i)){
					points[i] = parseInt(points[i] + this.getAbsolutePosition().x);
					points[i+1] = parseInt(points[i+1] + this.getAbsolutePosition().y);
				}
			}

			hotspotObj.shape.coords = points;
			displayPopertyPanel(hotspotObj);
			editCurrentHotspot(hotspotObj);
			drawHotspots();

			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};

	//Einzelner Punkt des Circles im Editmode
	var handlerCircleHandleDragend = function(point, hotspotObj){
		return function(e){
			displayPopertyPanel(hotspotObj);
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};

	//Einzelner Punkt des Circles im Editmode
	var handlerCircleMousemove = function(point, hotspotObj){
		return function(e){
			var centerX = hotspotObj.shape.coords[0];
			var centerY = hotspotObj.shape.coords[1];
			var handleX = point.getX();
			var handleY = point.getY();

			drawRadiusLine(centerX,centerY,handleX,handleY);

			hotspotObj.shape.coords[0] = centerX;
			hotspotObj.shape.coords[1] = centerY;
			hotspotObj.shape.coords[2] = linedistance(centerX,centerY,point.x(),point.y());

			//shapeslayer.batchDraw();
			drawHotspots();
		}
	};


	//ganzer Circle verschieben im Editmode
	var handlerDragendCircle = function(hotspotObj){
		return function(e){
			var x,
				y,
				r;

			x = this.getX();
			y = this.getY();
			r = this.getRadius();

			hotspotObj.shape.coords = [x,y,r];

			displayPopertyPanel(hotspotObj);
			editCurrentHotspot(hotspotObj);
			drawHotspots();
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};


	//Einzelner Punkt des Rectangle im Editmode
	var handlerRectangleHandleDragend = function(point, hotspotObj){
		return function(e){
			displayPopertyPanel(hotspotObj);
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};

	//Einzelner Punkt des Rectangle im Editmode
	var handlerRectangleHandleMousemove = function(point, hotspotObj){
		var centerX, centerY,handleX,handleY;
			centerX = hotspotObj.shape.coords[0];
			centerY = hotspotObj.shape.coords[1];
		return function(e){

			
			handleX = point.getX();
			handleY = point.getY();

			drawRadiusLine(centerX,centerY,handleX,handleY);
			hotspotObj.shape.coords = [centerX,centerY,handleX,handleY];
		
			drawHotspots();
			
			//shapeslayer.batchDraw();
			
			//shapeslayer.batchDraw();
			
		}

	};


	//ganzes Rectangle verschieben im Editmode:
	var handlerDragendRectangle = function(hotspotObj){
		return function(e){
			var x,
				y,
				w,
				h;

			x = this.getX();
			y = this.getY();
			w = this.getWidth() + x;
			h = this.getHeight() + y;

			hotspotObj.shape.coords = [x,y,w,h];

			displayPopertyPanel(hotspotObj);
			editCurrentHotspot(hotspotObj);
			drawHotspots();
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};


	/* ##### ##### ##### ##### ##### ##### ##### ##### DRAW NEW SHAPES EVENTHANDLER ##### ##### ##### ##### ##### ##### ##### ##### */
	var handlerDblClickNewPolygon = function(vertices){
		return function(e){
			var newHotspotObj = createNewHotspot(vertices);
			imagemapObj.imagemap.hotspots.push(newHotspotObj);
			displayPopertyPanel(newHotspotObj);
			//smartImageMap.module.setMode("selection");
			newpointsAry = [];
			drawnewhandlelayer.destroy();
			drawnewshapelayer.destroy();
			editCurrentHotspot(newHotspotObj);
			drawHotspots();
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
		}
	};

	var handlerMouseupNewCircle = function(coords){
			//ohne return da in anonymous callback aufgerufen
			var newHotspotObj = createNewHotspot(coords);
			imagemapObj.imagemap.hotspots.push(newHotspotObj);
			displayPopertyPanel(newHotspotObj);
			//smartImageMap.module.setMode("selection");
			newpointsAry = [];
			drawnewhandlelayer.destroy();
			drawnewshapelayer.destroy();
			editCurrentHotspot(newHotspotObj);
			drawHotspots();
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
	};


	var handlerMouseupNewRectangle = function(coords){
		//ohne return da in anonymous callback aufgerufen
		var newHotspotObj = createNewHotspot(coords);
		imagemapObj.imagemap.hotspots.push(newHotspotObj);
		displayPopertyPanel(newHotspotObj);
		//smartImageMap.module.setMode("selection");
		newpointsAry = [];
		drawnewhandlelayer.destroy();
		drawnewshapelayer.destroy();
		editCurrentHotspot(newHotspotObj);
		drawHotspots();
		//storeItem('hotspots', JSON.stringify(hotspots));
		storeItem('imagemap', JSON.stringify(imagemapObj));
	};


	//Einzelner Punkt des Polygons im CreateMode
	var handlerNewPolygonHandleMousemove = function(point){
		var oldX, oldY, newX, newY;

		oldX = point.getX();
		oldY = point.getY();

		return function(e){
			newX = point.getX();
			newY = point.getY();
			for (var i=0; i<newpointsAry.length;i++){
				if(oldX === newpointsAry[i] && oldY === newpointsAry[i+1]){
					newpointsAry[i] = newX;
					newpointsAry[i+1] = newY;
				}
			}

			oldX = newX;
			oldY = newY;

			drawNewPolygon(newpointsAry);
			drawnewshapelayer.setZIndex(19);
			drawnewhandlelayer.setZIndex(20);
		}
	};

	var handlerDblClickDeletePointFromPolygon = function(point,hotspotObj){
		return function(e){
			var x,y;
			x = point.getX();
			y = point.getY();

			for(var i=0; i<hotspotObj.shape.coords.length; i++){
				if(isEven(i)){
					if(x == hotspotObj.shape.coords[i] && y == hotspotObj.shape.coords[i+1]){
						hotspotObj.shape.coords.splice(i,2);
					}
				}
			}

			editCurrentHotspot(hotspotObj);
			drawHotspots();
			displayPopertyPanel(hotspotObj);
			//storeItem('hotspots', JSON.stringify(hotspots));
			storeItem('imagemap', JSON.stringify(imagemapObj));
			smartImageMap.module.setMode("selection");


			if (hotspotObj.shape.coords.length <= 4){
				deleteHotspot(hotspotObj);
			};

		}
	}

	/* ##### ##### ##### ##### ##### ##### ##### ##### END EVENTHANDLER FUNCTIONS ##### ##### ##### ##### ##### ##### ##### ##### */


	var createStage = function(){
		//$('body').append('<div id="container"/>');

		stage = new Kinetic.Stage({
			container: 'container'
		});
	};

	var loadimage = function(){

		var ratio;
		var correctedWidth;
		var correctedHeight;

		imagelayer = new Kinetic.Layer();
		imageObj = new Image();
		imageObj.src = settings.imagePath;

		imageObj.onload = function(){

			var theImage = new Kinetic.Image({
				x: 3,
				y: 3,
				image: imageObj
			});

			theImage.on('mousedown touchstart', function(){
				editlayer.destroy();
				radiuslayer.destroy();
				if(currentmode == "selection"){
					clearHandles();
					clearPopertyPanel();
				}
				/* DRAW NEW POLYGON */
				if(currentmode == "drawpolygon"){
					createNewPolygon();
				}
				/* DRAW NEW CIRCLE */
				if(currentmode == "drawcircle"){
					createNewCircle();
				}
				if(currentmode == 'drawrectangle'){
					createNewRectangle();
				}
			});//end image mousedown;

			originalImageWidth = imageObj.width;
			originalImageHeight = imageObj.height;
			ratio = imageObj.width / imageObj.height;
			correctedWidth = originalImageWidth;
			correctedHeight = originalImageHeight;

			if(imageObj.width >= settings.maximumImageSide){
				minificationFactor = parseFloat(originalImageWidth / settings.maximumImageSide);
				minificationFactor = minificationFactor.toFixed(2);
				imageObj.width = settings.maximumImageSide;
				imageObj.height = parseInt(settings.maximumImageSide / ratio);
				correctedWidth = settings.maximumImageSide;
				correctedHeight = parseInt(settings.maximumImageSide / ratio);
			}

			if(imageObj.height >= settings.maximumImageSide){
				minificationFactor = parseFloat(originalImageHeight / settings.maximumImageSide);
				minificationFactor = minificationFactor.toFixed(2);
				imageObj.height = settings.maximumImageSide;
				imageObj.width = parseInt(settings.maximumImageSide * ratio);
				correctedHeight = settings.maximumImageSide;
				correctedWidth = parseInt(settings.maximumImageSide * ratio);
			}

			var newimagemapObj = {
				"imagemap":{
					"name":"smartimagemap",
					"id":buildGuid(),
					"imgpath":settings.imagePath,
					"x":theImage.attrs.x,
					"y":theImage.attrs.y,
					"w":originalImageWidth,
					"h":originalImageHeight,
					"correctedW":correctedWidth,
					"correctedH":correctedHeight,
					"minfactor":minificationFactor,
					"hotspots":[]
				}
			};

			imagemapObj = newimagemapObj;

			var storedImagemapObj = readItem('imagemap');
			if(storedImagemapObj != null){
				if(storedImagemapObj.hasOwnProperty('imagemap')){
					if(storedImagemapObj.imagemap.hotspots){
						imagemapObj.imagemap.hotspots = storedImagemapObj.imagemap.hotspots;
						$('#imagemap').val(JSON.stringify(imagemapObj));
					}
				}
			}
			drawHotspots();
			smartImageMap.module.setMode("selection");

			imagelayer.add(theImage);
			stage.add(imagelayer);

			imagelayer.setZIndex(0);
			stage.setWidth(imageObj.width + 6);
			stage.setHeight(imageObj.height + 6);
		}; //end onload

	};


	//Draw New Shapes by clicking in image:
	var createNewRectangle = function(){
		var centerX,
		centerY;

		centerX = stage.getPointerPosition().x;
		centerY = stage.getPointerPosition().y;

		clearHandles();

		drawNewSingleHandlePoint(centerX,centerY,'rectangle');

		stage.on('mousemove',function(){
			var handleX,
				handleY,
				width,
				height;

			handleX = stage.getPointerPosition().x;
			handleY = stage.getPointerPosition().y;
			width = parseInt(handleX-centerX);
			height = parseInt(handleY-centerY);

			drawNewRectangle(centerX,centerY,width,height);
			drawRadiusLine(centerX,centerY,handleX,handleY);
			drawNewSingleHandlePoint(handleX,handleY,'rectangle');
		});
	};

	var drawNewRectangle = function(x,y,w,h){
		drawnewshapelayer.destroy();

		newrectangle = new Kinetic.Rect({
				x: x,
		        y: y,
		        width: w,
		        height:h,
		       	fill: settings.fillColorCreate,
				stroke: settings.strokeColorCreate,
				strokeWidth: 2,
				draggable:false
			});

		//newrectangle.on('dblclick', handlerDblClickNewRectangle([x,y,w+x,h+y]));

		drawnewshapelayer.add(newrectangle);
		stage.add(drawnewshapelayer);

	};

	var createNewCircle = function(){
		var centerX,
		centerY;

		centerX = stage.getPointerPosition().x;
		centerY = stage.getPointerPosition().y;

		clearHandles();

		drawNewSingleHandlePoint(centerX,centerY,'circle');
		drawCenterPoint(centerX,centerY);

		stage.on('mousemove',function(){
			var handleX,
				handleY,
				radius;
			handleX = stage.getPointerPosition().x;
			handleY = stage.getPointerPosition().y;
			radius = linedistance(centerX,centerY,handleX,handleY);
			drawNewCircle(centerX,centerY,radius);
			drawRadiusLine(centerX,centerY,handleX,handleY);
			drawNewSingleHandlePoint(handleX,handleY,'circle');
		});
	};


	var drawNewCircle = function(x,y,r){
		drawnewshapelayer.destroy();

		newcircle = new Kinetic.Circle({
				x: x,
				y: y,
				radius: r,
				fill: settings.fillColorCreate,
				stroke: settings.strokeColorCreate,
				strokeWidth: 2,
				draggable:false
			});

		//newcircle.on('dblclick', handlerDblClickNewCircle([x,y,r]));

		drawnewshapelayer.add(newcircle);
		stage.add(drawnewshapelayer);

	};

	var drawNewSingleHandlePoint = function(x,y,shape){
		drawnewhandlelayer.destroy();

		var point = new Kinetic.Circle({
	        x: x,
	        y: y,
	        radius: 5,
	        fill: settings.fillColorHandleCreate,
	        stroke: settings.strokeColorHandleCreate,
	        strokeWidth: 1,
	        draggable:false
	      });

		point.on('mouseup touchend',function(){
        	stage.off('mousemove touchmove');

        	if(shape == 'rectangle'){
	        	var x = newrectangle.getX();
	        	var y = newrectangle.getY();
	        	var w = newrectangle.getWidth();
	        	var h = newrectangle.getHeight();

	        	handlerMouseupNewRectangle([x,y,x+w,h+y]);
	        }

	        if(shape == 'circle'){
	        	var x = newcircle.getX();
	        	var y = newcircle.getY();
	        	var r = newcircle.getRadius();

	        	handlerMouseupNewCircle([x,y,r]);
	        }
        });

		drawnewhandlelayer.add(point);
		stage.add(drawnewhandlelayer);
	};

	var createNewPolygon = function(){
		var x,
			y,firstX,firstY;

		x = stage.getPointerPosition().x;
		y = stage.getPointerPosition().y;

		newpointsAry.push(x,y);
		drawNewPolygon(newpointsAry);
		drawNewPolygonHandlePoint(x,y,newpointsAry);
	};

	var drawNewPolygon = function(vertices){
		drawnewshapelayer.destroy();

		var newpolygon = new Kinetic.Line({
			points: vertices,
			fill: settings.fillColorCreate,
			stroke: settings.strokeColorCreate,
			strokeWidth: 2,
			draggable:false,
			closed:false
		});

		newpolygon.on('dblclick', handlerDblClickNewPolygon(vertices));
		drawnewshapelayer.add(newpolygon);
		stage.add(drawnewshapelayer);
	};

	//Draw New Shapes by clicking in image:
	var drawNewPolygonHandlePoint = function(x,y,vertices){
		var point = new Kinetic.Circle({
	        x: x,
	        y: y,
	        radius: 5,
	        fill: settings.fillColorHandleCreate,
	        stroke: settings.strokeColorHandleCreate,
	        strokeWidth: 1,
	        draggable:true
	      });

		
		point.on('mousedown touchstart',function(e){
			stage.on('mousemove touchmove',handlerNewPolygonHandleMousemove(point));
			
			if (vertices[0] == point.getX() && vertices[1] == point.getY()){
				var newHotspotObj = createNewHotspot(vertices);
				imagemapObj.imagemap.hotspots.push(newHotspotObj);
				displayPopertyPanel(newHotspotObj);
				//smartImageMap.module.setMode("selection");
				
				editCurrentHotspot(newHotspotObj);
				//drawHotspots();
				storeItem('imagemap', JSON.stringify(imagemapObj));
				newpointsAry = [];
			}

		});

		point.on('dragend touchend',function(){
			drawNewPolygon(newpointsAry);
			drawnewshapelayer.setZIndex(19);
			drawnewhandlelayer.setZIndex(20);
			stage.off('mousemove');
		});

		drawnewhandlelayer.add(point);
		stage.add(drawnewhandlelayer);
	};

	//Draw New Shapes by clicking in image:
	var drawNewCirclePoint = function(x,y){
		var point = new Kinetic.Circle({
	        x: x,
	        y: y,
	        radius: 5,
	        fill: settings.fillColorHandleCreate,
	        stroke: settings.strokeColorHandleCreate,
	        strokeWidth: 1,
	        draggable:false
	      });
		drawnewhandlelayer.add(point);
		stage.add(drawnewhandlelayer);
	};


	//Draw Exiting Shapes from hotspots Array:
	var drawHotspots = function(){
		shapeslayer.destroy();

		for(var i=0; i<imagemapObj.imagemap.hotspots.length; i++){
			drawShape(imagemapObj.imagemap.hotspots[i], shapeslayer);
		}
		stage.add(shapeslayer);
		//radiuslayer.setZIndex(11);
		editlayer.setZIndex(10);

	};

	//Draw Exiting Shapes from hotspots Array:
	var drawShape = function(hotspotObj, targetLayer){
		var shape,
			returnShape,
			coords;

		coords = hotspotObj.shape.coords;

		shape = getShapeTypeFromArrayLength(coords);

		if(shape == "circle"){
			returnShape = new Kinetic.Circle({
				x: coords[0],
		        y: coords[1],
		        radius: coords[2],
		        fill: settings.fillColor,
		        stroke: settings.strokeColor,
		        strokeWidth: 2,
		        draggable:true,
		        dragDistance:5
			});

			returnShape.on('dragend', handlerDragendCircle(hotspotObj));
		}

		
		if(shape == "rectangle"){
			returnShape = new Kinetic.Rect({
				x: coords[0],
		        y: coords[1],
		        width: coords[2]-coords[0],
		        height:coords[3]-coords[1],
		        fill: settings.fillColor,
		        stroke: settings.strokeColor,
		        strokeWidth: 2,
		        draggable:true,
		        dragDistance:5
			});

			returnShape.on('dragend', handlerDragendRectangle(hotspotObj));

		}

		if(shape == "polygon"){
			//In polygon Case theArray is [10,20,50,55] = [x1,y1,x2,y2]
			returnShape = new Kinetic.Line({
				points: coords,
		        fill: settings.fillColor,
		        stroke: settings.strokeColor,
		        strokeWidth: 2,
		        draggable:true,
		        dragDistance:5,
		        closed:true
			});

			returnShape.on('dragend', handlerDragendPolygon(hotspotObj));
		}

		returnShape.on('dragstart', function(){
			clearHandles();
			this.setFill(settings.fillColorDrag);
			this.setStroke(settings.strokeColorDrag);
		});
		returnShape.on('mousedown touchstart', handlerShape(hotspotObj, returnShape));
		returnShape.on('mouseup touchend', handlerShapeMouseup(hotspotObj, returnShape));

		returnShape.on('dblclick',handlerDeleteHotspot(hotspotObj));

		targetLayer.add(returnShape);
	};



	var displayPopertyPanel = function(hotspotObj){

		var elProperty, pform, shape, area, myLink;
		area = hotspotObj.shape.coords;
		shape = getShapeTypeFromArrayLength(area);
		elProperty = $('#propertypanel');

		elProperty.html('').show();
		elProperty.append('<div id="draghandle"><h2>Hotspot - '+translate('Eigenschaften')+' <span id="close">X</span></h2></div><form id="pform" name="saveproperties"/>');
		if(pform){
			pform.remove();
		}
		pform = $('#pform');

		pform.append('<table id="ptable"/>');

		myLink = hotspotObj.link;
		if (!myLink){
			myLink = '#';
		}

		ptable = $('#ptable');
		ptable.append('<tr><td><label>Id:</label></td><td class="tdlabel">'+ hotspotObj.id +'</td></tr>');
		ptable.append('<tr><td><label>'+translate('Form')+':</label></td><td class="tdlabel">'+ shape +'</td></tr>');
		ptable.append('<tr><td><label>'+translate('Bezeichnung')+':</label></td><td><input type="text" name="name" id="name" value="'+hotspotObj.name+'"/></td></tr>');
		ptable.append('<tr><td><label>'+translate('Link')+':</label></td><td><input type="text" name="link" id="link" value="'+ myLink +'"/></td></tr>');
		ptable.append('<tr><td><label>'+translate('Target')+':</label></td><td><input type="text" name="target" id="target" value="'+ hotspotObj.target +'"/></td></tr>');
		ptable.append('<tr><td><label>'+translate('Koordinaten')+':</label></td><td><textarea name="area" id="area">'+area+'</textarea></td></tr>');
		ptable.append('<tr><td><label>'+translate('Mouseover')+':</label></td><td><textarea name="mouseover" id="mouseover">'+hotspotObj.events.mouseover+'</textarea></td></tr>');
		ptable.append('<tr><td><label>'+translate('Mouseout')+':</label></td><td><textarea name="mouseout" id="mouseout">'+hotspotObj.events.mouseout+'</textarea></td></tr>');
		ptable.append('<tr><td><label>'+translate('Klick')+':</label></td><td><textarea name="click" id="click">'+hotspotObj.events.click+'</textarea></td></tr>');
		ptable.append('<tr><td></td><td><a class="btn btnok" href="javascript:void(0)" id="okhotspot">'+translate('OK')+'</a>&#160;<a class="btn btndelete" href="javascript:void(0)" id="deletehotspot">'+translate('Löschen')+'</a></td></tr>');
		
		//Event Bindings
		$('#deletehotspot').on('click',handlerDeleteHotspot(hotspotObj));

		$('#propertypanel').drags({handle:'#draghandle',cursor:'pointer'});
		$('#close').on('click',function(){
			clearPopertyPanel();
			clearHandles();
		});
		$('#okhotspot').on('click',function(){
			clearPopertyPanel();
			clearHandles();
		});

		$('#name').on('keyup',handlerSaveHotspot(hotspotObj));
		$('#link').on('keyup',handlerSaveHotspot(hotspotObj));
		$('#target').on('keyup',handlerSaveHotspot(hotspotObj));
		$('#area').on('keyup',handlerSaveHotspot(hotspotObj));
		$('#mouseover').on('keyup',handlerSaveHotspot(hotspotObj));
		$('#mouseout').on('keyup',handlerSaveHotspot(hotspotObj));
		$('#click').on('keyup',handlerSaveHotspot(hotspotObj));

	};

	var deleteHotspot = function(hotspotObj){
		clearPopertyPanel();
		clearHandles();
		removeObjectFromArray(imagemapObj.imagemap.hotspots, hotspotObj);
		drawHotspots();
		smartImageMap.module.setMode("selection");
		//storeItem('hotspots', JSON.stringify(hotspots));
		storeItem('imagemap', JSON.stringify(imagemapObj));
	};

	var clearPopertyPanel = function(){
		
		var elProperty,
			elOutput,
			elOutputSVG;

		elProperty = $('#propertypanel');
		elOutput = $('#outputcontainer');
		elOutputSVG = $('#outputcontainersvg');

		elProperty.html('').hide();
		elOutput.hide();
		elOutputSVG.hide();
		
		if($('#propertiesform')){
			$('#propertiesform').remove();
		}
	};

	var editCurrentHotspot = function(hotspotObj){
		var x,y,w,h,shape;

		//clearHandles();
		editlayer.destroy();
		
		var tempID = hotspotObj.id;
		
		shape = getShapeTypeFromArrayLength(hotspotObj.shape.coords);
		
		if(shape == "polygon"){

			for(var i=0; i<hotspotObj.shape.coords.length;i++){
				if(isEven(i)){
					x = hotspotObj.shape.coords[i];
					y = hotspotObj.shape.coords[i+1];
					drawHandle(x,y,hotspotObj);
				}
			};


			$('#container').off('mousedown').on('mousedown',function(e){
				if(e.shiftKey){
					addPointToPolygon(hotspotObj);
					//addPoint(hotspotObj);
				}
			});


		}//end if shape = "Polygon"

		if(shape == "circle"){
			x = hotspotObj.shape.coords[0] + hotspotObj.shape.coords[2];
			y = hotspotObj.shape.coords[1];
			drawHandle(x,y,hotspotObj);
			drawCenterPoint(hotspotObj.shape.coords[0],hotspotObj.shape.coords[1]);
		}

		if(shape == "rectangle"){
			x = hotspotObj.shape.coords[2];
			y = hotspotObj.shape.coords[3];
			drawHandle(x,y,hotspotObj);
		}
	};


	var drawHandle = function(x,y,hotspotObj){
		
		var shape = getShapeTypeFromArrayLength(hotspotObj.shape.coords);

		var point = new Kinetic.Circle({
			x: x,
			y: y,
			radius: 5,
			fill: settings.fillColorHandle,
			stroke: settings.strokeColorHandle,
			strokeWidth: 1,
			draggable:true
		});

		if (shape == "polygon"){
			point.on('dblclick',handlerDblClickDeletePointFromPolygon(point, hotspotObj));

			point.on('mousedown touchstart',function(){
				stage.on('mousemove touchmove',handlerPolygonHandleMousemove(point, hotspotObj));
			});
			point.on('dragend touchend',handlerPolygonHandleDragend(point, hotspotObj));
		}

		if (shape == "rectangle"){
			var centerX, centerY, handleX, handleY;

			centerX = hotspotObj.shape.coords[0];
			centerY = hotspotObj.shape.coords[1];
			handleX = point.getX();
			handleY = point.getY();

			drawRadiusLine(centerX,centerY,handleX,handleY);
			
			point.on('mousedown touchstart',function(){
				stage.on('mousemove touchmove',handlerRectangleHandleMousemove(point, hotspotObj));
			});
			point.on('dragend touchend',handlerRectangleHandleDragend(point, hotspotObj));
		}

		if (shape == "circle"){
			var centerX, centerY, handleX, handleY;

			centerX = hotspotObj.shape.coords[0];
			centerY = hotspotObj.shape.coords[1];
			handleX = point.getX();
			handleY = point.getY();

			drawRadiusLine(centerX,centerY,handleX,handleY);
			
			point.on('mousedown touchstart',function(){
				stage.on('mousemove touchmove',handlerCircleMousemove(point, hotspotObj));
			});
			point.on('dragend touchend',handlerCircleHandleDragend(point, hotspotObj));
		}

		point.on('mouseup touchend',function(){
			clearHandles();
			stage.off('mousemove touchmove');
			drawHotspots();
			editCurrentHotspot(hotspotObj);
			//setZIndexes();
		});

		editlayer.add(point);
		stage.add(editlayer);
	};


	var drawCenterPoint = function(x,y){
		var center = new Kinetic.Circle({
			x: x,
			y: y,
			radius: 2,
			fill: settings.centerPointFillColor,
			stroke: settings.centerPointStrokeColor,
			strokeWidth: 1,
			draggable:false
		});

		editlayer.add(center);
		stage.add(editlayer);
	};

	var drawRadiusLine = function(x,y,x1,y1){
		radiuslayer.destroy();

		var radiusline = new Kinetic.Line({
			points:[x,y,x1,y1],
			stroke: settings.radiusLineColor,
			strokeWidth:1
		});

		radiuslayer.add(radiusline);
		stage.add(radiuslayer);
		radiuslayer.setZIndex(1);
	};

	var clearHandles = function(){
		editlayer.destroy();
		radiuslayer.destroy();
		drawnewshapelayer.destroy();
		drawnewhandlelayer.destroy();
	};

	var createNewHotspot = function(pointsArray){
		var guid = buildGuid();
			return {
				"id": guid,
				"name":"",
				"shape": {
					"coords": pointsArray
				},
				"link": "",
				"target": "",
				"events": {
					"mouseover": "",
					"mouseout": "",
					"click": ""
				}
			}
	};

	var addPoint = function(hotspotObj){
		var xp,yp,xa,ya;
		var oldDistance, newDistance;

		xp = parseInt(stage.getPointerPosition().x);
		yp = parseInt(stage.getPointerPosition().y);

		newDistance = 10000;
		tempAry = [];
	
		for(var i=0; i<hotspotObj.shape.coords.length; i++){
			if(isEven(i)){
				xa = hotspotObj.shape.coords[i];
				ya = hotspotObj.shape.coords[i+1];

				oldDistance = linedistance(xp,yp,xa,ya);

				if(oldDistance < newDistance){
					newDistance = oldDistance;
					nearestX = xa;
					nearestY = ya;
				}
			}
		}

		//console.log(nearestX,nearestY);

	};


	var addPointToPolygon = function(hotspotObj){

	smartImageMap.module.setMode("selection");

						var xa, ya, xb, yb, xp, yp;
						var oldDistance, newDistance;

						newDistance = 10000;

						xp = parseInt(stage.getPointerPosition().x);
						yp = parseInt(stage.getPointerPosition().y);

						//hotspotObj.shape.coords.push(newX,newY);

						for(var i=0; i<hotspotObj.shape.coords.length; i++){
							if (isEven(i)){
								xa = hotspotObj.shape.coords[i];
								ya = hotspotObj.shape.coords[i+1];

								if (hotspotObj.shape.coords[i+2] && hotspotObj.shape.coords[i+3]){
									xb = hotspotObj.shape.coords[i+2];
									yb = hotspotObj.shape.coords[i+3];
								}
								else{
									//Die letzte Gerade ist die vom letzten Punkt zum Ersten !!
									xb = hotspotObj.shape.coords[0];
									yb = hotspotObj.shape.coords[1];
								}

								oldDistance = getDistancePointLine(xa,ya,xb,yb,xp,yp);
								
								if(oldDistance < newDistance){
									//Speichere die kuerzeste Strecke und den Startpunkt dieser Teilgeraden um dann im Array diesen Punkt zu finden.
									newDistance = oldDistance;
									lastX = xa;
									lastY = ya;
								}
							}
						}

						//console.log(newDistance, lastX, lastY);
						if(hotspotObj.shape.coords.indexOf(lastX) > -1){
							if(hotspotObj.shape.coords.indexOf(lastX)+1 == hotspotObj.shape.coords.indexOf(lastY)){
								insertPosition = hotspotObj.shape.coords.indexOf(lastY) + 1;
								//console.log(insertPosition, lastX, lastY, xp, yp);
								lastAddedPoint = xp,yp;
								hotspotObj.shape.coords.splice(insertPosition, 0, xp, yp);
								//console.log(hotspotObj.shape.coords);
							}
						}

						drawHandle(xp,yp,hotspotObj);
						displayPopertyPanel(hotspotObj);

	};

	//HELPER FUNCTIONS
	var replaceObjectInArray = function(ary, oldObj, newObj){
		ary[ary.indexOf(oldObj)] = newObj;
	};

	var removeObjectFromArray = function(ary, obj){
		for(var i=0; i<ary.length; i++){
			if(obj == ary[i]){
				ary.splice(i,1);
			}
		}
		return ary;
	};

	var convertCommaStringToArray = function(string){
		var retAry = [];
		var tempAry = string.split(",");
		for(var i=0; i<tempAry.length; i++){
			var theVal = parseInt(tempAry[i]);
			retAry.push(theVal);
		}
		return retAry;

	};

	var getShapeTypeFromArrayLength = function(ary){
		var strShape;

		switch(ary.length) {
			case 3:
				strShape = "circle";
				break;
			case 4:
				strShape = "rectangle";
				break;
			default:
				strShape = "polygon";
		}
		return strShape;
	};

	var isEven = function(x){
		return (x%2)==0;
	};

	var setZindexes = function(){
		imagelayer.setZIndex(0);
		shapeslayer.setZIndex(3);
		radiuslayer.setZIndex(5);
		editlayer.setZIndex(10);
	};

	var linedistance = function(x,y,x1,y1){
		var xs,ys;

		xs = 0;
		ys = 0;

		xs = x1 - x;
		xs = xs * xs;

		ys = y1 - y;
		ys = ys * ys;

		return parseInt(Math.sqrt( xs + ys ));
	};

	var getDistancePointLine = function(xa,ya,xb,yb,xp,yp){
		//gegeben Punkte A (xa,ya) B (xb,yb) und  P (xp,yp)
		//gesucht kuerzester Abstand der Geraden AB zu Punkt P (= Normalenvektor auf Strecke AB)
		//mit Hessscher Normalenform (Ax + By + C = 0) ergibt sich:
		//Umgestellt nach Koordinatenform: (ya - yb) * xp + (xb - xa) * yp + ((xa*yb)-(xb*ya)) = 0
		//Ax + By + C / Wurzel(A*A + B*B) = Abstand Punkt P zu Gerade AB
		var retval;
		retval = ((ya - yb) * xp + (xb - xa) * yp + ((xa*yb)-(xb*ya))) / Math.sqrt(((ya - yb)*(ya - yb))+((xb - xa)*(xb - xa)));
		return Math.sqrt(retval*retval);//nur betrag ohne vorzeichen !!

	};

	var buildGuid = function(){
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x7|0x8)).toString(16);
		});
		return uuid;
	};

	var translate = function(identifier){
		var message = identifier;
	    if (____lang != undefined) {
	        if (____lang[identifier] != undefined) {
	            message = ____lang[identifier];
	        }
	    }
	    return message;
	};

	var coordinateCorrection = function(minFactor, oldAry){
		var newAry = [];

		if(minFactor > 1){
			for(var j=0; j<oldAry.length; j++){
				correction = parseInt(oldAry[j] * minFactor);
				newAry.push(correction);
			}
		}
		else{
			newAry = oldAry;
		}
		return newAry;
	};

	var createoutput = function(format){
		var elTarget,
			strOutput,
			strArea,
			mapgiud,
			w,
			h;

			mapguid = buildGuid();
			strOutput = '';
			strArea = '';
			elTarget = $('#output');

		elTarget.html('');
		w = imageObj.width;
		h = imageObj.height;

		if(minificationFactor > 1){
			w = originalImageWidth;
			h = originalImageHeight;
		}

		if(format === 'html'){
			for(var i=0; i<imagemapObj.imagemap.hotspots.length; i++){

				//Koordinatenkorrektur, falls das Bild zu gross ist um in Originalgroesse in die Stage geladen zu werden.
				//Dann wird das bild kleingerechnet und die Ausgabekoordinaten um diesen Faktor korrigiert, das Ausgabebild bleibt also
				//in seiner Ursprungsgroesse erhalten.
				var outputCords = coordinateCorrection(minificationFactor,imagemapObj.imagemap.hotspots[i].shape.coords);
				
				var shape = getShapeTypeFromArrayLength(outputCords);
				if(shape == "rectangle"){shape = 'rect'};
				if(shape == "polygon"){shape = 'poly'};
				strArea += '&lt;area shape="'+shape+'" data-id="'+imagemapObj.imagemap.hotspots[i].id+'" name="'+imagemapObj.imagemap.hotspots[i].name+'"';
				strArea += ' coords="'+outputCords.join()+'"';
				strArea += ' href="'+imagemapObj.imagemap.hotspots[i].link+'"';

				if(imagemapObj.imagemap.hotspots[i].target){
					strArea += ' target="'+imagemapObj.imagemap.hotspots[i].target+'"';
				}
				if(imagemapObj.imagemap.hotspots[i].events.mouseover){
					strArea += ' onmouseover="'+imagemapObj.imagemap.hotspots[i].events.mouseover+'"';
				}
				if(imagemapObj.imagemap.hotspots[i].events.mouseout){
					strArea += ' onmouseout="'+imagemapObj.imagemap.hotspots[i].events.mouseout+'"';
				}
				if(imagemapObj.imagemap.hotspots[i].events.click){
					strArea += ' onclick="'+imagemapObj.imagemap.hotspots[i].events.click+'"';
				}
				strArea += '/&gt;\n';
			}

			strOutput += '&lt;img src="'+settings.imagePath+'" width="'+w+'" height="'+h+'" alt="mymap" usemap="#'+mapguid+'" data-id="'+mapguid+'"/&gt;\n\n';
			strOutput += '&lt;map id="'+mapguid+'" name="'+mapguid+'"&gt;\n';
			strOutput += strArea;
			strOutput += '&lt;/map&gt;';
		}

		if(format === 'svg'){
			for(var i=0; i<imagemapObj.imagemap.hotspots.length; i++){
				var outputCords = coordinateCorrection(minificationFactor,imagemapObj.imagemap.hotspots[i].shape.coords);
				var shape = getShapeTypeFromArrayLength(imagemapObj.imagemap.hotspots[i].shape.coords);
				strArea += '&lt;a xlink:href="'+imagemapObj.imagemap.hotspots[i].link+'"';

				if(imagemapObj.imagemap.hotspots[i].target){
					strArea += ' target="'+imagemapObj.imagemap.hotspots[i].target+'"';
				}
				if(imagemapObj.imagemap.hotspots[i].events.mouseover){
					strArea += ' onmouseover="'+imagemapObj.imagemap.hotspots[i].events.mouseover+'"';
				}
				if(imagemapObj.imagemap.hotspots[i].events.mouseout){
					strArea += ' onmouseout="'+imagemapObj.imagemap.hotspots[i].events.mouseout+'"';
				}
				if(imagemapObj.imagemap.hotspots[i].events.click){
					strArea += ' onclick="'+imagemapObj.imagemap.hotspots[i].events.click+'"';
				}
				strArea += '&gt;\n';

				if (shape == "circle"){
					strArea += '&lt;circle data-name="'+imagemapObj.imagemap.hotspots[i].name+'" data-id="'+imagemapObj.imagemap.hotspots[i].id+'" cx="'+outputCords[0]+'" cy="'+outputCords[1]+'" r="'+outputCords[2]+'" fill="transparent" stroke="transparent"/&gt;\n';
				}
				if (shape == 'rectangle'){
					strArea += '&lt;rect data-name="'+imagemapObj.imagemap.hotspots[i].name+'" data-id="'+imagemapObj.imagemap.hotspots[i].id+'" x="'+outputCords[0]+'" y="'+outputCords[1]+'" width="'+parseInt(outputCords[2] - outputCords[0])+'" height="'+parseInt(outputCords[3] - outputCords[1])+'" fill="transparent" stroke="transparent"/&gt;\n';
				}
				if (shape == 'polygon'){
					polypoints = '';
					for(var j=0; j<outputCords.length; j++){
						polypoints += outputCords[j] + ' ';
					}
					polypoints = polypoints.trim();
					strArea += '&lt;polygon data-name="'+imagemapObj.imagemap.hotspots[i].name+'" data-id="'+imagemapObj.imagemap.hotspots[i].id+'" points="'+polypoints+'" fill="transparent" stroke="transparent"/&gt;\n';
				}
				strArea += '&lt;/a&gt;\n';
			}

			strOutput += '&lt;?xml version="1.0" encoding="ISO-8859-1"?&gt;\n';
			//with w and h is not responsive:
			//strOutput += '&lt;svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"&gt;\n';
			strOutput += '&lt;svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 '+w+' '+h+'"&gt;\n';
			strOutput += '&lt;image x="0" y="0" width="'+w+'" height="'+h+'" data-id="'+mapguid+'" xlink:href="'+settings.imagePath+'"&gt;&lt;/image&gt;\n\n';
			strOutput += strArea;
			strOutput += '&lt;/svg&gt;';
		}

		if(format === 'json'){
			strOutput = JSON.stringify(imagemapObj.imagemap);
		}

		elTarget.html(strOutput);
	};

	var createHTMLContainer = function(elContainer){
		var el,
			html;
		el = $(elContainer);
		html = '<div class="centercontainer">';
		html += '<div class="buttoncontainer">';
			html += '<a href="javascript:void(0)" class="btnmode selection" id="selection" title="Selection Mode"></a>';
			html += '<a href="javascript:void(0)" class="btnmode drawcircle" id="drawcircle" title="Draw circle"></a>';
			html += '<a href="javascript:void(0)" class="btnmode drawrectangle" id="drawrectangle" title="Draw rectangle"></a>';
			html += '<a href="javascript:void(0)" class="btnmode drawpolygon" id="drawpolygon" title="Draw polygon"></a>';
		html += '</div>';

		html += '<div class="buttoncontainer">';
			html += '<a href="javascript:void(0)" class="btnmode clearall" id="deleteallhotspots" title="Delete all Hotspots"></a>';
		html += '</div>'

		html += '<div class="buttoncontainer">';
			html += '<a href="javascript:void(0)" class="btnmode createoutput" id="html" title="Create HTML output"></a>';
			html += '<a href="javascript:void(0)" class="btnmode createoutput" id="svg" title="Create SVG output"></a>';
			html += '<a href="javascript:void(0)" class="btnmode createoutput" id="json" title="Create JSON output"></a>';
		html += '</div>';

		html += '<div id="container" class="container"></div>';

		html += '<a class="extlink" target="_blank" href="http://www.twitter.com/@thooyork">@thooyork</a>';
	html += '</div>';
	html += '<div class="propertypanel" id="propertypanel"></div>';

	html += '<div class="outputcontainer" id="outputcontainer"></div>';
	html += '<textarea id="imagemap" class="hotspotsarea" name="json"></textarea>';

	el.append(html);
	};

	
	//PUBLIC API PART
	return{
		init:function(options){
			var that = this;

			settings = $.extend({}, defaults, options);

			createHTMLContainer(settings.htmlcontainer);

			createStage();

			loadimage();

			$('.btnmode').on('click', function(){that.setMode($(this).attr('id'));});
			$('.createoutput').on('click',handlerCreateOutput());
			$('#deleteallhotspots').on('click',handlerDeleteAllHotspots());

			$('#savehotspots').on('click',function(){
				$('#savehotspotsform').submit();
			});

		},
		setMode:function(strMode){
			currentmode = strMode;
			$('.btnmode').removeClass('active');
			$('#'+strMode).addClass('active');
			newpointsAry = [];
		},
		getMode:function(){
			return currentmode;
		}
	}//end return

}());//end module
