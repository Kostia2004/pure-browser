// Load l10n strigns
var pb_detected = $('#pb_has_detected').text();
var potential = $('#potential').text();
var trackers = $('#tracking_domains').text();
var from_these_sites = $('#so_far').text();
var feed_the_badger_title = $('#feed_the_badger_title').text();
var delay = 500;
var originCache = null;

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate){ func.apply(context, args); }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow){ func.apply(context, args); }
  };
}

// Loads options from localStorage and sets UI elements accordingly
function loadOptions() {
  // Add event listeners

  // load resources for filter sliders
  $(function () {
    $('#blockedResources').css('max-height',$(window).height() - 300);
    $(window).on('focus', debounce(handleVisibilityChange, 1000, true));
    function handleVisibilityChange(){
      self.port.emit("reqSettings");
    }

    // Set up input for searching through tracking domains.
    $('#trackingDomainSearch').attr('placeholder', $('#options_domain_search').text());
    $('#trackingDomainSearch').on('input', filterTrackingDomains);

    $("#blockedResourcesContainer").on("change", "input:radio", updateOrigin);
    $('#blockedResourcesContainer').on('click', '.userset .honeybadgerPowered', resetControl);
    $('#blockedResourcesContainer').on('mouseenter', '.tooltip', displayTooltip);
    $('#blockedResourcesContainer').on('mouseleave', '.tooltip', hideTooltip);

    $('.addButton').click(addDomainException);
    $('.removeButton').click(removeDomainExceptions);
    $('.prefToggle').change(updateUserPref);
  });


  // Display jQuery UI elements
  $("#tabs").tabs();
  $("button").button();
  $(".refreshButton").button("option", "icons", {primary: "ui-icon-refresh"});
  $(".addButton").button("option", "icons", {primary: "ui-icon-plus"});
  $(".removeButton").button("option", "icons", {primary: "ui-icon-minus"});

  // Request settings from addon - defined in lib/ui.js
  self.port.emit('reqSettings');

  self.port.on('recvSettings', function(settings){
    // Options contains the following objects
    // storage: localStorage for the addon, defined in lib/userStorage
    // prefs: from the simple-prefs sdk
    loadDisabledSites(settings.disabledSites);
    loadPrefs(settings.prefs);
    if (! originCache) {
      loadTrackingDomains(settings.origins);
    } else {
      showTrackingDomainStats(settings.origins);
    }
  });
}
$(loadOptions);

function updateOrigin(event){
  var $elm = $('label[for="' + event.currentTarget.id + '"]');
  var $switchContainer = $elm.parents('.switch-container').first();
  var $clicker = $elm.parents('.clicker').first();
  var origin = $clicker.data('origin');
  var action = $elm.data('action');
  $switchContainer.removeClass('reset block cookieblock noaction').addClass(action);
  toggleBlockedStatus($clicker, action);
  $clicker.find('.honeybadgerPowered').first().attr('tooltip', feed_the_badger_title);
  $clicker.attr('tooltip', _badgerStatusTitle(action, origin));
  $switchContainer.attr('tooltip', _badgerStatusTitle(action, origin));
  $clicker.children('.tooltipContainer').text(_badgerStatusTitle(action, origin));
}
function resetControl(event) {
  // Removes a userset setting
  var $elm = $(event.currentTarget);
  var $clicker = $elm.parents('.clicker').first();
  var origin = $clicker.attr("data-origin");
  self.port.emit("resetDomain", origin);
}
function displayTooltip(event){
  var $elm = $(event.currentTarget);
  var $container = $elm.closest('.clicker').children('.tooltipContainer');
  if($container.length === 0){
    $container = $elm.siblings('.keyTipOuter').children('.tooltipContainer');
  }
  $container.text($elm.attr('tooltip')).show();
  $container.siblings('.tooltipArrow').show();
}
function hideTooltip(event){
  var $elm = $(event.currentTarget);
  var $container = $elm.closest('.clicker').children('.tooltipContainer');
  if($container.length === 0){
    $container = $elm.siblings('.keyTipOuter').children('.tooltipContainer');
  }
  $container.text('').hide();
  $container.siblings('.tooltipArrow').hide();
}
function toggleBlockedStatus(elt,status) {
  console.log('toggle blocked status', elt, status);
  $(elt).removeClass("reset block cookieblock noaction").addClass(status);
  $(elt).addClass("userset");
  setTimeout(function(){
    // Let the animation finish first, it runs smoother this way
    updateSettings(elt, status);
  }, delay);
  return true;
}
function updateSettings(elt, status) {
  var $elt = $(elt);
  var origin = $elt.attr("data-origin");
  if ($elt.hasClass("userset")){
    self.port.emit("updateDomain", {origin: origin, action: status});
  } else {
    console.log("Got update that wasn't user-set:", origin, status);
  }
}

function loadDisabledSites(disabledSites){
console.log('disabled sites', disabledSites);
$('#excludedDomainsBox').empty();
$.each(disabledSites, function(key) {
  $('#excludedDomainsBox')
    .append($('<option>', { value : key })
    .text(key));
});
}

function removeDomainExceptions(event){
event.preventDefault();
var selected = $(document.getElementById("excludedDomainsBox")).find('option:selected');
var domains = [];
for(let i = 0; i < selected.length; i++){
  domains.push(selected[i].text);
}
self.port.emit('removeFromDisabledSites', domains);
}

function addDomainException(event){
event.preventDefault();
var domain = $('#newWhitelistDomain').val();
$('#newWhitelistDomain').val('');
self.port.emit('addToDisabledSites', domain);
}

function loadPrefs(prefs){
  console.log('prefs', prefs);
  var prefToggles = $('.prefToggle');
  $.each(prefToggles, function(idx, toggle){
    if(!!prefs[toggle.id]){
      $(toggle).prop('checked', true);
    }
  });
}

function updateUserPref(e){
  var target = e.target;
  self.port.emit('updateUserPref', {
    name: target.id,
    value: $(target).is(':checked')
  });
}

// Partial-reverses each domain name in a list and sorts alphabetically
function _reverseSort(list){
  function reverseString(str) {
    return str.split('.').reverse().join('.');
  }
  return list.map(reverseString).sort().map(reverseString);
}

/**
 * Displays tracking domains with overview and tooltips.
 * @param domains Tracking domains to display.
 */
function loadTrackingDomains(domains) {
  originCache = domains;

  // Display overview.
  let trackingOverview = pb_detected + ' <span id="count">0</span> ' + potential +
    ' <a id="trackerLink" target=_blank tabindex=-1 title="What is a tracker?" ' +
    'href="https://www.eff.org/privacybadger#trackers">' +
    trackers + '</a> ' + from_these_sites;
  $('#detected').html(trackingOverview);

  // Display tooltips.
  let trackingTooltips = '<div class="key">' +
    '<div class="keyTipOuter"><div class="tooltipContainer" id="keyTooltip"></div></div>' +
    '<img class="tooltip" src="icons/UI-icons-red.png" tooltip="Move the slider left to block a domain.">'+
    '<img class="tooltip" src="icons/UI-icons-yellow.png" tooltip="Center the slider to block cookies.">'+
    '<img class="tooltip" src="icons/UI-icons-green.png" tooltip="Move the slider right to allow a domain.">'+
    '</div><div id="blockedOriginsInner"></div>';
  $('#blockedResources').html(trackingTooltips);

  showTrackingDomainStats(domains);

  console.log("Done loading tracking domains");
}

/**
 * Displays stats for tracking domains.
 * @param domains Tracking domains to display stats for.
 */
function showTrackingDomainStats(domains) {
  originCache = domains;

  // Display updated tracking domain count.
  let trackingDomainCount = Object.keys(domains).length;
  $('#count').text(trackingDomainCount);

  // If no search text has been entered then update all domains to ensure new
  // domains are included. If not, only refresh display for domains to avoid
  // messing up user's filtered list.
  let searchText = $('#trackingDomainSearch').val();
  if (searchText.length === 0) {
    showTrackingDomains(Object.keys(domains));
  } else {
    let filteredDomains = getFilteredTrackingDomains(searchText);
    refreshTrackingDomainDisplay(filteredDomains);
  }
}

/**
 * Displays filtered list of tracking domains based on user input.
 * @param event Input event triggered by user.
 */
function filterTrackingDomains(event) {
  let initialSearchText = $('#trackingDomainSearch').val();

  // Wait a short period of time and see if search text has changed.
  // If so it means user is still typing so hold off on filtering.
  let timeToWait = 500;
  setTimeout(function() {
    // Check search text.
    let searchText = $('#trackingDomainSearch').val();
    if (searchText !== initialSearchText) {
      return;
    }

    // Show filtered tracking domains.
    let domains = getFilteredTrackingDomains(searchText);
    showTrackingDomains(domains);
  }, timeToWait);
}

/**
 * Gets array of filtered tracking domains.
 *
 * @param {String} searchText Text to check tracking domains against.
 * @returns {Array} Tracking domains containing search text, case-insensitive.
 */
function getFilteredTrackingDomains(searchText) {
  let searchTextLowerCase = searchText.toLowerCase();

  let domains = [];
  for (let trackingDomain in originCache) {
    // Ignore object properties.
    if (! originCache.hasOwnProperty(trackingDomain)) {
      continue;
    }

    // Ignore domains that do not contain search text.
    if (trackingDomain.toLowerCase().indexOf(searchTextLowerCase) > -1) {
      domains.push(trackingDomain);
    }
  }
  return domains;
}

/**
 * Displays list of tracking domains along with toggle controls.
 * @param domains Tracking domains to display.
 */
function showTrackingDomains(domains) {
  let sortedDomains = _reverseSort(domains);

  // Create HTML for list of tracking domains.
  let trackerDetails = '<div id="blockedOriginsInner">';
  for (let i = 0; i < sortedDomains.length; i++) {
    let tracker = sortedDomains[i];
    let action = originCache[tracker];
    // todo: gross hack, use templating framework
    trackerDetails = _addOriginHTML(tracker, trackerDetails, action);
  }
  trackerDetails += '</div>';

  // Display tracking domains.
  $('#blockedOriginsInner').html(trackerDetails);
  $('.switch-toggle').each(function(){ registerSliderHandlers(this); });
}

/**
 * Refreshes display for given domains to show any action changes.
 *
 * @param {Array} domains Domains to refresh display for.
 */
function refreshTrackingDomainDisplay(domains) {
  for (let i = 0; i < domains.length; i++) {
    let trackingDomain = domains[i];
    let domainHtml = _addOriginHTML(trackingDomain, '', originCache[trackingDomain]);
    $("div[data-origin='" + trackingDomain + "']").replaceWith(domainHtml);
    $('.switch-toggle').each(function(){ registerSliderHandlers(this); });
  }
}

function registerSliderHandlers(elem){
  let radios = $(elem).children('input');
  let value = $(elem).children('input:checked').val();
  let slider = $("<div></div>").slider({
    min: 0,
    max: 2,
    value: parseInt(value, 10),
    create: function(){
      $(elem).children('.ui-slider-handle').css('margin-left', -16 * value + 'px');
    },
    slide: function(event, ui) {
      radios.filter("[value=" + ui.value + "]").click();
    },
    stop: function(event, ui){
      $(ui.handle).css('margin-left', -16 * ui.value + "px");
    },
  }).appendTo(elem);
  radios.change(function(){
    slider.slider("value", parseInt(radios.filter(':checked').val(), 10));
  });
}

function _addOriginHTML(rawOrigin, printable, action) {
  // Sanitize origin string, strip out any HTML tags.
  var origin = rawOrigin.replace(/</g, '').replace(/>/g, '');
  var classes = ["clicker", "tooltip"];
  var title = feed_the_badger_title;
  if (action.indexOf("user") === 0) {
    classes.push("userset");
    action = action.substr(4);
  } else {
    title = '';
  }
  if (action == "block" || action == "cookieblock") {
    classes.push(action);
  }
  var classText = 'class="' + classes.join(" ") + '"';

  return printable + '<div ' + classText + '" data-origin="' + origin + '" tooltip="' + _badgerStatusTitle(action, origin) + '"><div class="honeybadgerPowered tooltip" tooltip="'+ title + '"></div><div class="origin">' + origin + '</div>' + _addToggleHtml(origin, action) + '<img class="tooltipArrow" src="icons/badger-tb-arrow.png"><div class="tooltipContainer"></div></div>';
}
function _badgerStatusTitle(action, origin){
  let postfix;
  if (!origin) {
    postfix = " this tracker.";
  } else {
    postfix = " "+origin+".";
  }

  var statusMap = {
    block: "Blocked",
    cookieblock: "Blocked cookies from",
    noaction: "Allowed"
  };

  return statusMap[action] + postfix;
}
function _addToggleHtml(origin, action){

  var output = "";
  output += '<div class="switch-container tooltip ' + action + '" tooltip="' + _badgerStatusTitle(action, origin)  + '">';
  output += '<div class="switch-toggle switch-3 switch-candy">';
  output += '<input id="block-' + origin + '" name="' + origin + '" value="0" type="radio" '+ _checked('block',action)+ '><label class="actionToggle" for="block-' + origin + '" data-origin="' + origin + '" data-action="block"></label>';
  output += '<input id="cookieblock-' + origin + '" name="' + origin + '" value="1" type="radio" '+ _checked('cookieblock',action)+ '><label class="actionToggle" value="1" for="cookieblock-' + origin + '" data-origin="' + origin + '" data-action="cookieblock"></label>';
  output += '<input id="noaction-' + origin + '" name="' + origin + '" value="2" type="radio" '+ _checked('noaction',action)+ '><label class="actionToggle" value="2" for="noaction-' + origin + '" data-origin="' + origin + '" data-action="noaction"></label>';
  output += '<a><img src="icons/badger-slider-handle.png"></a></div></div>';
  return output;
}

function _checked(name, action){
  if(name == action){
    return 'checked';
  } else {
    return '';
  }
}

// TODO: Styling
// TODO: Optimization
