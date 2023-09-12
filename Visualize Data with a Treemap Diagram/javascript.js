// We'll make sure that the page is fully loaded before making our AJAX request:
document.addEventListener("DOMContentLoaded", function() {
	let request = new XMLHttpRequest();
	request.open (
		"GET",
		"https://cdn.rawgit.com/freeCodeCamp/testable-projects-fcc/a80ce8f9/src/data/tree_map/movie-data.json",
		true
	)	
	request.send();
	// When we receive our data back, we'll do...
	request.onload = function() {
		const dataset = JSON.parse(request.responseText);
		
		// With our data in hand, we'll start by defining all of our important variables. This will make our code more comprehensible, and also easier to make small tweaks as needed without having to scroll all the way through the code:
		const w = 1000; // NB: Test #6 of the freeCodeCamp test suite fails if the size is not 1000 x600. This is a known issue.
		const h = 600;
		const paddingTop = 160;
		const paddingRight = 0;
		const paddingBottom = 0;
		const paddingLeft = 0;
		
		const labelPadding = 5;
		
		const toolTipSpacingY = -30;
		const toolTipSpacingX = 20;
		
		const legendSpacing = 20;
		const legendRectW = ( w - paddingLeft - paddingRight - (dataset.children.length - 1) * legendSpacing ) / dataset.children.length;
		const legendRectH = 20;
		
		const tileStroke = "white";
		const colors = {};
		// We'll write a function that generates the colors we need for filling in the rectangles in our treemap diagram and saves these colors to our colors array. The function will generate as many colors as there are categories in our dataset. Note that the colors are defined in hsl() and all share the same saturation and lightness values. The hue value is calculated to give us colors that are evenly spaced along the spectrum:
		const colorBuilder = function() {
			let numberOfColors = dataset.children.length;
			let hueStep = 359 / numberOfColors;	
			// For each "Category" in our dataset, we'll generate a color and store the name of the category and the HSL color as a key-value pair in our colors object:
			for ( i in dataset.children) {
				colors[dataset.children[i].name] = "hsl(" + Math.round(i * hueStep + hueStep / 2) + ", 75%, 85%)"
			}
		};
		// We'll then invoke/call our function so that our colors object gets populated
		colorBuilder();
		
		
		
		// Now that we have all of our variables neatly saved for easy access, let's start building our diagram in earnest.
		// We'll first create and place the SVG that will contain our treemap diagram:
		const svg = d3.select("#container")
			.append("svg")
				.attr("id", "chart")
				.attr("width", w)
				.attr("height", h)
		;
		
		// One of the user stories calls for a chart title, so let's add one:
		svg
			.append("text")
				.attr("id", "title") // project requirement
				.text("Movie Sales")
				.attr("x", w / 2 )
				.attr("y", 2/5 * paddingTop )
				.attr("text-anchor", "middle" )
		;
		
		// We also need to add a description, as per the user stories:
		svg
			.append("text")
				.attr("id", "description") // project requirement
				.text("Top 100 highest grossing movies by genre")
				.attr("x", w / 2 )
				.attr("y", 2/5 * paddingTop )
				.attr("text-anchor", "middle")
				.attr("dominant-baseline", "hanging")
		;
		
		// Let's also add a legend at the top of our chart in order to fulfill another user story. In our legend, we want to pair a rectangle of color and some text, but SVG rectangles can't have text elements ppended to them, so instead, we'll create a group for each legend item and add a rectangle and then a text element to each group. We'll then center the text over the rectangle. Remember that in SVGs, the later elements get "painted" on top of the earlier elements
		const legend = svg
			.append("g")
				.attr("id", "legend")
				.attr("transform", "translate(" + (paddingLeft) + ", " + (2/3 * paddingTop) + ")" )
				.selectAll("g")
				.data( dataset.children )
				.enter()
					.append("g")
		;
		
		legend // add rectangles within each of the groups we've placed in our legend
			.append("rect")
				.attr("class", "legend-item") // project requirement
				.attr("width", legendRectW )
				.attr("height", legendRectH )
				.attr("x", (d, i) => i * (legendRectW + legendSpacing) )
				.attr("fill", (d) => colors[d.name] )
		;
		
		legend // add text labels within each of the groups we've placed in our legend
			.append("text")
				.attr("class", "legend-label")
				.attr("x", (d, i) => legendRectW / 2 + i * (legendRectW + legendSpacing) )
				.attr("y", legendRectH / 2 )
				.attr("text-anchor", "middle" )
				.attr("dominant-baseline", "central")
				.text( (d) => d.name )				
		;
		
		
		// Let's now turn our attention to the tooltips. We'll start by adding a div that will serve as our tooltip:
		const toolTipBox = d3.select("#container")
			.append("div")
			.attr("id", "tooltip")
		;
		// Next, we'll build a function that will dynamically generate the html that will placed in our tooltip
		const toolTipContent = function(d) {
			// The value from our dataset is a string, so we'll convert it into an integer...
			let tempValue = parseInt(d.data.value);
			// ... and we'll then take advantage of .toLocaleSting() and its optional parameters to convert the value integer into a nicrely formatted currency figure with no decimal places. By leaving the first parameter as undefined, we let the browser detect the user's locale and apply it...
			let localeValue = tempValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
			// .. before returning the HTML that we want to see inside our tooltip:
			return "<span id='tooltip-name'>" + d.data.name + "</span><br/><span id='tooltip-category'>(" + d.data.category + ")</span><br/><span id='tooltip-value'>" + localeValue + "</span>";
		};		
		
		
		// Now it's time to start generating our treemap diagram, and we'll do so by using D3 to establish a data hierarchy that will allow us to layout our treemap later.
		// NB: A d3.hierarchy object is a data structure that represents a hierarchy. It has a number of functions defined on it for retrieving things like ancestor, descendant and leaf nodes and for computing the path between nodes. It can be created from a nested JavaScript object.
		const root = d3.hierarchy(dataset);
		
		// We'll then set up the treemap layout using D3:
		const treemapLayout = d3.treemap()
			.size( [w - paddingLeft - paddingRight, h - paddingTop - paddingBottom] )
			.paddingInner(0)
		;
		
		// Before we pass any data to D3, we need to run .sum() on the hierarchy. By doing this, we'll set .value on each node in our data tree to match the sum of its children (this way D3 know how "big" each parent is and can compare and size them). Note that we specify that we want to sum the "value" property, and not some other property.
		root.sum( (d) => d.value );
		
		// We can now call our layout with the "summed" data. This step adds 4 coordinates (i.e. x0, x1, y0, y1) to each node in our dataTree, thus defining the size of the rectangle for each node (top-left to bottom-right):
		treemapLayout(root);
		
		// Finally, with our dataset ready for action, we can place our node-rectangles in the SVG, color them, and add all the necessary attributes according to the user stories:
		const tiles = svg
			.append("g")
				.attr("id", "treemap")
				.attr("transform", "translate(" + paddingLeft + ", " + paddingTop +")" ) // We've move the entire treemap into position
				.selectAll("g")
				.data( root.leaves() )  // !!! Note that using root.descendants() will render the same treemap, but cause the test suite to fail on two tests, likely because it includes "non-movie" parent nodes.
				.enter()
					.append("g") // one group per tile so that we can add text labels (NB: we can't append text to rectangles)
						.attr("transform", (d) => "translate(" + d.x0 + ", " + d.y0 + ")" ) // place the top-left corner of each group where its rectangle tile should have its top-left corner. This way, when we add the rectangles and text elements to each group, they'll already be where they need to be.
		;
		
		tiles // within each tile group we'll...
			.append("rect")
				.attr("class", "tile") // project requirement
				.attr("data-name", (d) => d.data.name ) // project requirement
				.attr("data-category", (d) => d.data.category ) // project requirement
				.attr("data-value", (d) => d.data.value ) // project requirement
				.attr("width", (d) => d.x1 - d.x0 )
				.attr("height", (d) => d.y1 - d.y0 )
				.attr("stroke", tileStroke )
				.attr("fill", (d) => colors[d.data.category] )
				.on("mousemove", (d, i) => { // We'll use mousemove instead of the usual mouseover event for a more "lively" feel
					toolTipBox
						.html( toolTipContent(d) ) // invoke our HTML generator
						.attr("data-value", d.data.value) // project requirement
						.style("top", d3.event.pageY + toolTipSpacingY + "px" ) // We add some spacing to avoid "mousing over our own tooltip". NB: because this is a DIV, and therefore CSS styling, we need to add a unit
						.style("left", d3.event.pageX + toolTipSpacingX + "px" ) // We add some spacing to avoid "mousing over our own tooltip". NB: because this is a DIV, and therefore CSS styling, we need to add a unit
						.style("background", colors[d.data.category]) // We match the tooltip's background color to its tile's color
						.style("opacity", 0.95 )
						.style("visibility", "visible") // show tooltip
				})
				.on("mouseout", (d, i) => {
					toolTipBox
						.style("opacity", 0 )
						.style("visibility", "hidden") // We need to actually hide the tooltip. If we only make opacity=0, the tooltip, though invisible to the user, will still be there on top of our SVG, and will block any mouseover events for any tiles that it is "covering". By setting visibility back to hidden on mouseout events, we avoid this issue.
				})
		;
		
		// We also want to add labels to our tiles. Using text() is difficult however, as the text won't wrap and we'd have to write a complicated wrapping function to resolve the issue. Rather, we'll use foreignObject in order to place a DIV within the SVG tile, and then add HTML to the div, which will automatically wrap:
		tiles // within each tile group, also...
			.append("foreignObject")
				.attr("width", (d) => d.x1 - d.x0 ) // same width as its tile group
				.attr("height", 0.01 ) // We need to give the foreignObject a height or it won't render. If we set it to the full height of the tile, it'll cover the tile (and its child div), making it difficult/impossible to have mouseover events for the DIVs. To address this issue, we set the height of the foreignObject to a very small amount that is still >0, and in the CSS, we'll set foreignObject to overflow=visible.
				.append("xhtml:div")
					.attr("class", "tile-label")
					.html( (d) => d.data.name )
		;
	
	// And we're done!
	
	}; // END of request.onload	
}); // END of DOMContentLoaded event listener