/*
 * Licensed to Jasig under one or more contributor license
 * agreements. See the NOTICE file distributed with this work
 * for additional information regarding copyright ownership.
 * Jasig licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

//
//  Notifications portlet jQuery-based function developed on behalf of the University of Manchester
//
//  Author: Jacob Lichner
//  Email: jlichner@unicon.net
//

var notificationsPortletView = notificationsPortletView || function ($, rootSelector, _, opts) {

  // Underscore's templating syntax
  var templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g, // {{ variable }}
    evaluate    : /\{%(.+?)%\}/g    // {% expression %}
  };

    var rootjQueryObj = $(rootSelector);
  
    // Cache existing DOM elements
    var portlet         = rootjQueryObj.find(".notification-portlet-wrapper"),
        outerContainer  = rootjQueryObj,
        links           = rootjQueryObj.find(".notification-portlet a"),
        errorContainer  = rootjQueryObj.find(".notification-error-container"),
        loading         = rootjQueryObj.find(".notification-loading"),
        notifications   = rootjQueryObj.find(".notification-container"),
        detailView      = rootjQueryObj.find(".notification-detail-wrapper"),
        detailContainer = rootjQueryObj.find(".notification-detail-container"),
        backButton      = rootjQueryObj.find(".notification-back-button"),
        refreshButton   = rootjQueryObj.find(".notification-refresh a"),
        filterOptions   = rootjQueryObj.find(".notification-options"),
        todayFilter     = filterOptions.find(".today"),
        allFilter       = filterOptions.find(".all");
        
    // Notification gets cached in the AJAX callback but is created here for scope
    var notification;
    
    // Store the filter state (notifications that are currently being displayed), defaults to today
    var filterState = {"days": 1};
    
    var getNotifications = function(params, doRefresh) {
            
      // First 'prime-the-pump' with an ActionURL
      $.ajax({
        type: 'POST',
        data: { refresh: doRefresh },
        url: opts.invokeNotificationServiceUrl,
        async: false
      });

      // Now fetch the notifications with a ResourceURL
      $.ajax({
        url      : opts.getNotificationsUrl,
        type     : 'POST',
        dataType : 'json',
        data     : params,
        
        beforeSend: function () {
          
          // Hide detail view
          if ( detailView.is(":visible") ) {
            detailView.hide();
            notifications.show();
          }

          // Show loading
          portlet.hide();
          loading.show();

          // Unbind click events
          links.unbind("click");
          backButton.unbind("click");
          filterOptions.find("a").unbind("click");

          // Clear out notifications and errors
          notifications.html(" ");
          errorContainer.html(" ");
        },
        
        success: function (data) {
          var notificationResponse = data.notificationResponse;
          
          // Build notifications
          buildNotifications(notificationResponse);

          // Once notifications have been injected into the DOM we cache the notification element...
          notification = outerContainer.find(" .notifications a");

          // ...and bind our events
          bindEvent.accordion(notificationResponse);
          bindEvent.viewDetail();
          bindEvent.goBack();
          bindEvent.refresh();
          bindEvent.filterOptions(notificationResponse);

          // Errors
          errorHandling(notificationResponse);

          // Loading div is displayed by default.  Hide it after the AJAX call completes and display notifications..
          loading.hide();
          portlet.fadeIn("fast");
          filterOptions.fadeIn("fast");
        },
        
        error: function () {
            rootjQueryObj.html(" ").text("Request for data failed.");
        }
      });

    // Build notifications using underscore.js template method
    var buildNotifications = function(notificationResponse) {

      // HTML string compiled with underscore.js
      var html = '\
        {% if (_.isUndefined(data.categories) || _.isEmpty(data.categories)) { %} \
          <div class="no-notifications-container"> \
            <h3>You have 0 notifications.</h3> \
          </div> \
        {% } else { %} \
          {% var accordion = data.categories.length > 1; %} \
          {% _.each(data.categories, function(category) { %} \
            <div class="notification-trigger"> \
              <h3 class="portlet-section-header trigger-symbol" role="header"> \
                {{ category.title }} \
                {% if (accordion) { %} \
                  ({{ category.entries.length }}) \
                {% } %} \
              </h3> \
            </div> \
            {% if (category.entries.length < 1) { %} \
              <!-- no notifications --> \
            {% } else { %} \
              <div class="notification-content" style="display: none;"> \
                <ul class="notifications"> \
                  {% _.each(category.entries, function(entry) { %} \
                    <li> \
                      {% if (!accordion) { %} \
                        &raquo; \
                      {% } %} \
                      <a href="{{ entry.url }}" \
                         data-body="{{ escape(entry.body) }}" \
                         data-title="{{ entry.title }}" \
                         data-source="{{ entry.source }}"> {{ entry.title }}</a> \
                      {% if ( entry.dueDate ) { \
                           var date  = new Date(entry.dueDate.time), \
                               month = date.getMonth() + 1, \
                               day   = date.getDate(), \
                               year  = date.getFullYear(), \
                               overDue = (date < new Date() ? " overdue" : ""); %} \
                        <span class="notification-due-date{{ overDue }}"> \
                          Due {{ month }}/{{ day }}/{{ year }} \
                        </span> \
                      {% } %} \
                    </li> \
                  {% }); %} \
                </ul> \
              </div> \
            {% } %} \
          {% }); %} \
        {% } %} \
      ';
      var compiled = _.template(html, notificationResponse, {
          variable: 'data',
          interpolate : templateSettings.interpolate,
          evaluate : templateSettings.evaluate
      });

      // Inject compiled markup into notifications container div
      notifications.html(" ").prepend(compiled);
    };

    // Bind events object helps keep events together 
    var bindEvent = {

      // Accordion via plugin
      accordion: function (data) {
        if (!data.categories || data.categories.length === 1 ) {
          portlet.removeClass("accordion");
          notifications.children().show();
        } else {
            notificationsAccordion($, notifications);
          portlet.addClass("accordion");
        }
      },

      // View detail page
      viewDetail: function () {
        notification.click(function () {

          // Notification detail is retrieved from 'data-' 
          // attributes and stored in a notification object
          var notification = {
            body   : $(this).data("body"),
            title  : $(this).data("title"),
            source : $(this).data("source"),
            link   : $(this).attr("href")
          }

          var html = '\
            <h3><a href="{{ link }}">{{ title }}</a></h3> \
            <p>{{ unescape(body) }}</p> \
            <p class="notification-source"> \
              Source: <a href="{{ link }}">{{ source }}</a> \
            </p> \
          ';
          var compiled = _.template(html, notification, {
              interpolate : templateSettings.interpolate,
              evaluate : templateSettings.evaluate
          });
          
          $.each([notifications, errorContainer], function () {
            $(this).hide(
              "slide", 200, function () {
                detailContainer.html(" ").append(compiled);
                detailView.show();
              });
          });

          return false;
        });
      },

      // Go back to all notifications
      goBack: function () {
        backButton.click(function () {
          detailView.hide(
            "slide", {direction: "right"}, 200, function () {
              notifications.show();
              errorContainer.show();
            }
          )

          return false;
        })
        .hover(
          function () { $(this).addClass('hover'); },
          function () { $(this).removeClass('hover') }
        );
      },
      
      refresh: function () {
        refreshButton.click(function () {
          getNotifications(filterState, 'true');
          return false;
        });
      },
      
      filterOptions: function (data) {
        todayFilter.click(function () {
          filter($(this), {"days":1});
          return false;
        });
        
        allFilter.click(function () {
          filter($(this));
          return false;
        });
      }
    };
    
    // Filter notifications by passing params via ajax ie {"days":1} is today, also stores and returns filterState
    var filter = function(link, params) {
      filterState = params || {};
      if ( link.hasClass("active") ) {
        return false;
      } else {
        getNotifications(filterState);
        filterOptions.find("a").removeClass("active");
        link.addClass("active");
      }
      return filterState;
    };
    
    // Errors (broken feeds)
    var errorHandling = function(data) {
      if ( data.errors ) {
        var html = '\
          {% _.each(errors, function(error) { %} \
            <div class="portlet-msg-error" errorkey="{{ error.key }}"> \
              {{ error.source }}: {{ error.error }} \
              <a href="#" class="remove" title="Hide"></a> \
            </div> \
          {% }); %} \
        ';  
        var compile = _.template(html, data, {
            interpolate : templateSettings.interpolate,
            evaluate : templateSettings.evaluate
        });
        
        errorContainer.show().append(compile);
        errorContainer.find(".remove").click(function () {
         var thisErrorContainer = $(this).parent();
         thisErrorContainer.fadeOut("fast", function () {
            var settings = [];
            $.ajax({
              url: (opts.hideErrorUrl).replace("ERRORKEY", thisErrorContainer.attr("errorkey")),
              type: 'POST', 
              success: function() { return false; }
            });
          });
          return false;
        }); 
      }
    };
  };

  // Load notifications
  getNotifications(filterState);

};
