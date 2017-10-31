// Taisun Launch page
// Client side javascript


// Initiate a websocket connection to the server
var host = window.location.hostname; 
var port = window.location.port;
var converter = new showdown.Converter({parseImgDimensions: true});
var socket = io.connect('http://' + host + ':' + port, {
});
// When Local is clicked render
$("#local").click(function(){
  renderlocal();
});
// When Dockerhub is clicked render
$("#dockerhub").click(function(){
  renderdockerhub();
});  
// When Taisun Stacks is clicked render
$("#stacks").click(function(){
  renderstacks();
});
// When dockerhub is clicked render
//// Page renders for launching ////
// Local Images
function renderlocal(){
  $('#launchcontent').empty();
  $('#launchcontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-hdd-o"></i>\
      Local Images\
    </div>\
    <div class="card-body">\
      <div class="table-responsive">\
        <table id="images" class="table table-bordered" width="100%" cellspacing="0">\
          <thead>\
            <tr>\
              <th>Image</th>\
              <th>ID</th>\
              <th>Created</th>\
              <th>Size</th>\
              <th>Launch</th>\
            </tr>\
          </thead>\
        </table>\
      </div>\
    </div>\
  </div>');
  socket.emit('getimages');
  // When the server sends us the images on this machine render in the rows
  socket.on('sendimages', function(images) {
    $("#images").dataTable().fnDestroy();
    var imagestable = $('#images').DataTable( {} );
    imagestable.clear();
    //Loop through the images to build the images table
    for (i = 0; i < images.length; i++){
      var image = images[i];
      if (image.RepoTags){
        // Do not show dangling images
        if (image.RepoTags[0] != '<none>:<none>'){
          imagestable.row.add(
            [image.RepoTags[0],
            image.Id.split(':')[1].substring(0,12),
            new Date( image.Created * 1e3).toISOString().slice(0,19), 
            (image.Size / 1000000) + ' MB', 
            '<button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs launchcontainer" data-dismiss="modal" data-toggle="modal" data-target="#launchconsole" value="' + image.RepoTags[0] + '">Launch <i class="fa fa-rocket"></i></button>'] 
          );
        }
      }
    }
    imagestable.draw();
  });
}
// Dockerhub Page
function renderdockerhub(){
  $('#launchcontent').empty();
  $('#launchcontent').append('\
  <form class="form-inline mb-3" onsubmit="return false;">\
    <div class="input-group">\
      <input type="text" class="form-control" placeholder="Search" id="hubsearch">\
      <div class="input-group-btn">\
        <button onclick="dockersearch(1)" type="button" class="btn btn-default"><i class="fa fa-search"></i></button>\
      </div>\
    </div>\
  </form>\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-docker"></i>\
      DockerHub\
    </div>\
    <div class="card-body" id="dockerresults">\
    <center><h2>Please search for Docker images</h2></center>\
    </div>\
  </div>');
  document.getElementById("hubsearch").addEventListener("keydown", function (e) {
    if (e.keyCode === 13) { 
      dockersearch(1);
    }
  });
}
// Dockerhub Page
function renderstacks(){
  socket.emit('getstacks', '1');
  $('#launchcontent').empty();
  $('#launchcontent').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-bars"></i>\
      Taisun Stacks\
    </div>\
    <div class="card-body" id="taisunstacks">\
    <center><i class="fa fa-refresh fa-spin" style="font-size:36px"></i><br><h2>Fetching available stacks from Taisun.io</h2></center>\
    </div>\
  </div>\
  ');
}



//// DockerHub Search ////
// When search button is activated send string to server
function dockersearch(page){
  $('#dockerresults').empty();
  // Set the content to a spinner to signify loading
  $('#dockerresults').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
  socket.emit('searchdocker', $('#hubsearch').val(), page);
}
// When the server gives us the results parse them
socket.on('hubresults', function(data) {
  $('#dockerresults').empty();
  // If we did not get an results do not create table
  if (data.num_results == 0){
    $('#dockerresults').append('<center><h2>No Results</h2></center>');
  }
  else {
    // Create table for dockerhub results
    $('#dockerresults').append('<table style="width:100%" id="hubresults" class="table table-bordered table-hover"></table>');
    $('#hubresults').append('<thead><tr><th>Name</th><th>Rating</th><th>Description</th><th></th></tr></thead>');
    for (i = 0; i < data.results.length; i++){
      var name = data.results[i].name;
      var description = data.results[i].description;
      var stars = data.results[i].star_count;
      $('#hubresults').append('<tr><td>' + name + '</td><td>' + '<i class="fa fa-star-o"></i>' + stars + '</td><td>' + description + '</td><td><button type="button" data-toggle="modal" data-target="#pull" style="cursor:pointer;" class="btn btn-primary btn-xs hubinfo" value="' + name + '"><i class="fa fa-download"></i> Pull</button></td></tr>')
    }
    // Pagination logic show +2 and -2 pages at the bottom of the table
    $('#dockerresults').append('<ul id="dockerhubpages" class="pagination"></ul>');
    for (i = -2; i < 3; i++){
      var pagenumber = parseInt(data.page) + i;
      // If negative page number do not display 
      if ( pagenumber <= 0){
      }
      // If current page highlight current
      else if ( pagenumber == data.page){
        $('#dockerhubpages').append('<li class="page-item active"><a class="page-link" onclick="dockersearch(' + pagenumber + ')">' + pagenumber + '</a></li>');
      }
      // If not current page
      else if (parseInt(data.num_pages) - pagenumber >= 0){
        $('#dockerhubpages').append('<li class="page-item"><a class="page-link" onclick="dockersearch(' + pagenumber + ')">' + pagenumber + '</a></li>');
      }
    }
  }
});

//// Get supplimental info on the dockerhub container
$('body').on('click', '.hubinfo', function(){
  socket.emit('gethubinfo', $(this).attr("value"));
  $('#pulltitle').empty();
  $('#pulltitle').append($(this).attr("value").replace('_/','') + ' Image Information' );
  $('#pullbody').empty();
  $('#pullbody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});
// Render in info page for image on pull modal
socket.on('sendhubinfo', function(data) {
  $('#pullbody').empty();
  if (data.user == 'library'){
    var user = '_';
  }
  else{
    var user = data.user;
  }
  var name = data.name;
  var pullcount = data.pull_count;
  var stars = data.star_count;
  var description = data.description;
  $('#pullbody').append('\
  <div class="row">\
    <div class="col-lg-8">' +
      description + '<br><br>\
      <ul class="list-group" style="width:30%;">\
        <li class="list-group-item justify-content-between">Stars <span class="badge badge-primary badge-pill pull-right">' + stars + '</span></li>\
        <li class="list-group-item justify-content-between">Pulls <span class="badge badge-primary badge-pill pull-right">' + pullcount + '</span></li>\
      </ul><br>\
    </div>\
    <div class="col-lg-4"><br><center>\
      <button type="button" style="cursor:pointer;" class="btn btn-success btn-xs pullimage" data-dismiss="modal" data-toggle="modal" data-target="#pullconsole" value="' + (user + '/' + name).replace('_/','') + ':latest' + '"><i class="fa fa-download"></i> Pull Latest</button><br><br>\
      <button type="button" style="cursor:pointer;" data-dismiss="modal" data-toggle="modal" data-target="#tags" class="btn btn-primary btn-xs browsetags" value="' + user + '/' + name + '"><i class="fa fa-eye"></i> Browse Tags</button><br><br>\
    </center></div>\
  </div>');
  $('#pullbody').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-book"></i>\
      Full Description\
    </div>\
    <div class="card-body">' + 
    converter.makeHtml(data.full_description) +
    '</div>\
  </div>');
});
// When the tags modal is launched clear it out and ask the server for the info
$('body').on('click', '.browsetags', function(){
  socket.emit('gettags', $(this).attr("value"));
  $('#tagstitle').empty();
  $('#tagstitle').append($(this).attr("value").replace('_/','') + ' Repo Tags' );
  $('#tagsbody').empty();
  $('#tagsbody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});
// When the server sends tag info populate tags modal
socket.on('sendtagsinfo', function(arr) {
  var data = arr[0];
  var name = arr[1];
  $('#tagsbody').empty();
  $('#tagsbody').append('<table style="width:100%" id="tagsresults" class="table table-bordered table-hover"></table>');
  $('#tagsresults').append('<thead><tr><th>Name</th><th>Size</th><th>Updated</th><th></th></tr></thead>');
  for (i = 0; i < data.length; i++){
    var tag = data[i].name;
    var size = data[i].full_size;
    var updated = data[i].last_updated;
    $('#tagsresults').append('<tr><td>' + tag + '</td><td>' + (size / 1000000) + ' MB' + '</td><td>' + updated + '</td><td><button type="button" style="cursor:pointer;" class="btn btn-primary btn-xs pullimage" data-dismiss="modal" data-toggle="modal" data-target="#pullconsole" value="' + name.replace('_/','') + ':' + tag  + '"><i class="fa fa-download"></i> Pull</button></td></tr>')
  }  
});
// Pull image at specific tag
$('body').on('click', '.pullimage', function(){
  socket.emit('sendpullcommand', $(this).attr("value"));
  $('#pullconsoletitle').empty();
  $('#pullconsoletitle').append('Pulling ' + $(this).attr("value"));
  $('#pullconsolebody').empty();
  $('#pullconsolebody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});
// Show console output for pull
socket.on('sendpullstart', function(output) {
  $('#pullconsolebody').empty();
  $('#pullconsolebody').append('<pre>' + output + '</pre>')
});
socket.on('sendpulloutput', function(output) {
  $('#pullconsolebody').append('<pre>' + output + '</pre>')
});
// Launch a single container (just console for now)
$('body').on('click', '.launchcontainer', function(){
  socket.emit('sendlaunchcommand', $(this).attr("value"));
  $('#launchconsoletitle').empty();
  $('#launchconsoletitle').append('Launching ' + $(this).attr("value"));
  $('#launchconsolebody').empty();
});
socket.on('container_update', function(output) {
  $('#launchconsolebody').append('<pre>' + output + '</pre>')
});

//// Taisun Stacks logic
// When the server gives us the stacks parse them
socket.on('stacksresults', function(data) {
  $('#taisunstacks').empty();
  // If the file is invalid show error
  if (data.stacktemplates == null || data.stacktemplates == undefined){
    $('#taisunstacks').append('<center><h2>Error Fetching file</h2></center>');
  }
  else {
    // Create table for taisun results
    $('#taisunstacks').append('<table style="width:100%" id="stackstable" class="table table-bordered table-hover"></table>');
    $('#stackstable').append('<thead><tr><th></th><th>Name</th><th>Description</th><th></th></tr></thead>');
    for (i = 0; i < data.stacktemplates.length; i++){
      var name = data.stacktemplates[i].name;
      var description = data.stacktemplates[i].description;
      var iconurl = data.stacktemplates[i].icon;
      var dataurl = data.stacktemplates[i].stackdata;
      $('#stackstable').append('<tr height="130"><td><center><img src="' + iconurl + '"></center></td><td>' + name + '</td><td>' + description + '</td><td><button type="button" data-toggle="modal" data-target="#stackconfigure" style="cursor:pointer;" class="btn btn-primary btn-xs configurestack" value="' + dataurl + '">Configure and Launch <i class="fa fa-rocket"></i></button></td></tr>')
    }
  }
});
// When the configure button is clicked send the URL to the server and give the user a spinner
$('body').on('click', '.configurestack', function(){
  socket.emit('sendstackurl', $(this).attr("value"));
  $('#stackmodaltitle').empty();
  $('#stackmodaltitle').append('Pulling definition from ' + $(this).attr("value"));
  $('#stackmodalbody').empty();
  $('#stackmodalbody').append('<i class="fa fa-refresh fa-spin" style="font-size:36px"></i>');
});

// When the server sends us the stack data render in the configure modal
socket.on('stackurlresults', function(data) {
  var name = data[0];
  var markdown = data[1];
  var url = data[3];
  $('#stackmodaltitle').empty();
  $('#stackmodaltitle').append(name);
  $('#stackmodalbody').empty();
  $('#stackmodalbody').append(converter.makeHtml(markdown));
  $('#stackmodalbody').append('\
  <div class="card mb-3">\
    <div class="card-header">\
      <i class="fa fa-pencil"></i>\
      Launch Options\
    </div>\
    <div class="card-body">\
      <form id="stackform">' + 
       formbuilder(data[2]) +
        '<div class="modal-footer">\
          <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel <i class="fa fa-times-circle-o"></i></button>\
          <button type="button" class="btn btn-success" id="createstack" data-dismiss="modal" value="' + url + '">Create Stack <i class="fa fa-rocket"></i></button>\
        </div>\
      </form>\
    </div>\
  </div>');
});
// Convert the body object we get from the server into a bootstrap form
function formbuilder(data){
  var formdata = '';
  // Loop through the form elements and render based on type
  for (i = 0; i < data.length; i++){
    if(i !== data.length -1) { 
      formdata += inputbuild(data[i]);
    }
    else {
      formdata += inputbuild(data[i]);
      return formdata;
    }
  }
}
//individual input lines
function inputbuild(input) {
  var type = input.type;
  switch(type){
    case 'input':
      return '\
        <div class="form-group row">\
        <label class="col-sm-2 control-label">' + input.FormName + '</label>\
          <div class="col-sm-10">\
          <input type="text" data-label="' + input.label + '" class="form-control stackinputdata" placeholder="' + input.placeholder + '">\
          </div>\
        </div>';
      break;
    case 'select':
      var options = '';
      var opts = input.options;
      for (i = 0; i < opts.length; i++){
        if(i !== opts.length -1) { 
          options += '<option value="' + opts[i] + '">' + opts[i] + '</option>';
        }
        else {
          options += '<option value="' + opts[i] + '">' + opts[i] + '</option>';
          return'\
          <div class="form-group row">\
            <label class="col-sm-2 control-label">' + input.FormName + '</label>\
              <div class="col-sm-10">\
              <select data-label="' + input.label + '" class="custom-select stackinputdata">' + 
                options +
              '</select>\
              </div>\
           </div>';
           break;
        }
      }
    // if no matches return blank  
    default:
      return '';
  }
}
// Send the form data to the server
$('body').on('click', '#createstack', function(){
  var inputs = {};
  var url = $("#createstack").val();
  // Create an object with all the inputs for nunchucks
  $(".stackinputdata").each(function() {
    var value = $(this).val();
    var label = $(this).data('label');
    inputs[label] = value;
  }).promise().done(function(){
    socket.emit('launchstack',{"stackurl":url,"inputs":inputs});
  });
});


// Render local page on page load
renderlocal();

// Grabbed from the admin template
(function($) {
  "use strict"; // Start of use strict
  // Configure tooltips for collapsed side navigation
  $('.navbar-sidenav [data-toggle="tooltip"]').tooltip({
    template: '<div class="tooltip navbar-sidenav-tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>'
  });
  // Toggle the side navigation
  $("#sidenavToggler").click(function(e) {
    e.preventDefault();
    $("body").toggleClass("sidenav-toggled");
    $(".navbar-sidenav .nav-link-collapse").addClass("collapsed");
    $(".navbar-sidenav .sidenav-second-level, .navbar-sidenav .sidenav-third-level").removeClass("show");
  });
  // Force the toggled class to be removed when a collapsible nav link is clicked
  $(".navbar-sidenav .nav-link-collapse").click(function(e) {
    e.preventDefault();
    $("body").removeClass("sidenav-toggled");
  });
  // Prevent the content wrapper from scrolling when the fixed side navigation hovered over
  $('body.fixed-nav .navbar-sidenav, body.fixed-nav .sidenav-toggler, body.fixed-nav .navbar-collapse').on('mousewheel DOMMouseScroll', function(e) {
    var e0 = e.originalEvent,
      delta = e0.wheelDelta || -e0.detail;
    this.scrollTop += (delta < 0 ? 1 : -1) * 30;
    e.preventDefault();
  });
  // Scroll to top button appear
  $(document).scroll(function() {
    var scrollDistance = $(this).scrollTop();
    if (scrollDistance > 100) {
      $('.scroll-to-top').fadeIn();
    } else {
      $('.scroll-to-top').fadeOut();
    }
  });
  // Configure tooltips globally
  $('[data-toggle="tooltip"]').tooltip();
  // Smooth scrolling using jQuery easing
  $(document).on('click', 'a.scroll-to-top', function(event) {
    var $anchor = $(this);
    $('html, body').stop().animate({
      scrollTop: ($($anchor.attr('href')).offset().top)
    }, 1000, 'easeInOutExpo');
    event.preventDefault();
  });
  // Call the dataTables jQuery plugin
  $(document).ready(function() {
    $('#dataTable').DataTable();
  });
})(jQuery);