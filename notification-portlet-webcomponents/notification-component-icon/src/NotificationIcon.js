import React, {Component} from 'react';
import {
  Dropdown,
  DropdownMenu,
  DropdownToggle,
  DropdownItem,
} from 'reactstrap';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import {translate} from 'react-i18next';
import reactTimeout from 'react-timeout';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import get from 'lodash/get';
import find from 'lodash/find';

const StyledDropdown = styled(Dropdown)``;
const StyledDropdownMenu = styled(DropdownMenu)`
  & {
    // NOTE: overload portal styles
    transform: translate3d(0, 32px, 0) !important;
    z-index: 1002 !important;
  }
`;
const StyledDropdownToggle = styled(DropdownToggle)`
  &:hover,
  &:focus {
    color: white;
  }

  &.up-notification--toggle {
    background-color: inherit;
  }

  &.up-notification--toggle.up-active {
    background-color: #d50000;
  }
`;
const StyledDropdownItem = styled(DropdownItem)`
  & {
    // NOTE: overload portal styles
    width: 100%;
    clear: both;
    padding: 0.25rem 1.5rem;
    display: block;
    color: black !important;
  }

  &.up-notification--menu-item {
    border-bottom: 1px solid gray;
  }

  &.up-notification--menu-header {
    border-bottom: 2px solid gray;
  }

  &.up-unread {
    background-color: lightgray;
  }
`;

class NotificationIcon extends Component {
  static propTypes = {
    userInfoApiUrl: PropTypes.string,
    tokenTimeoutMs: PropTypes.number,
    notificationApiUrl: PropTypes.string,
    seeAllNotificationsUrl: PropTypes.string,
    debug: PropTypes.bool,
  };

  static defaultProps = {
    userInfoApiUrl: '/uPortal/api/v5-1/userinfo',
    tokenTimeoutMs: 180000, // 3 minutes
    notificationApiUrl: '/NotificationPortlet/api/v2/notifications',
    seeAllNotificationsUrl: '/uPortal/p/notification',
    debug: false,
  };

  state = {
    isDropdownOpen: false,
    bearerToken: null,
    notifications: [],
  };

  fetchBearerToken = async () => {
    const {setTimeout, userInfoApiUrl, tokenTimeoutMs} = this.props;

    try {
      const response = await fetch(userInfoApiUrl, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const bearerToken = await response.text();

      this.setState({bearerToken});

      // clear token after timeout has passed
      setTimeout(function() {
        this.setState({bearerToken: null});
      }, tokenTimeoutMs);

      return bearerToken;
    } catch (err) {
      // TODO: add an error view
      console.error(err);
    }
  };

  fetchNotifications = async () => {
    let {bearerToken} = this.state;
    const {notificationApiUrl, debug} = this.props;

    try {
      if (!bearerToken && !debug) {
        bearerToken = await this.fetchBearerToken();
      }
      const response = await fetch(notificationApiUrl, {
        credentials: 'same-origin',
        headers: {
          'Authorization': 'Bearer ' + bearerToken,
          'content-type': 'application/jwt',
        },
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const notifications = await response.json();

      this.setState({notifications});
    } catch (err) {
      // TODO: add an error view
      console.error(err);
    }
  };

  toggle = () => {
    this.setState(({isDropdownOpen}) => {
      // TODO: determine why debounce is needed
      // debounce toggle
      if (isDropdownOpen === this.state.isDropdownOpen) {
        return {
          isDropdownOpen: !isDropdownOpen,
        };
      }
    });
  };

  doPost = (url) => () => {
    let form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
  };

  renderNotificationCount = () => {
    const {t} = this.props;
    const {notifications} = this.state;

    const unreadCount = notifications.filter(
      ({attributes}) => !JSON.parse(get(attributes, 'READ.0', 'true'))
    ).length;

    return (
      <span className="up-notification--notification-count">
        {unreadCount || ''}
        <span className="sr-only">{t('notification-count', {unreadCount})}</span>
      </span>
    );
  };

  renderNotifications = () => {
    const {t} = this.props;
    const {notifications} = this.state;

    // empty notifications
    if (notifications.length < 1) {
      return (
        <StyledDropdownItem className="up-notification--menu-item" disabled>
          {t('notifications-all-read')}
        </StyledDropdownItem>
      );
    }

    // one or more notifications
    return notifications.map(
      ({url, id, body, title, attributes, availableActions}) => {
        let onClick = undefined;
        let href = url;

        // Is this link based on MarkAsReadAndRedirectAction?
        const action = find(availableActions, {
          id: 'MarkAsReadAndRedirectAction',
        });
        if (action) {
          onClick = this.doPost(action.apiUrl);
          href = 'javascript:void(0)';
        }

        return (
          <StyledDropdownItem
            key={id || body}
            tag="a"
            className={
              'up-notification--menu-item ' +
              (JSON.parse(get(attributes, 'READ.0', 'true'))
                ? 'up-read'
                : 'up-unread')
            }
            onClick={onClick}
            href={href}
          >
            {title}
          </StyledDropdownItem>
        );
      }
    );
  };

  componentDidMount = this.fetchNotifications;

  render = () => {
    const {t, seeAllNotificationsUrl} = this.props;
    const {notifications, isDropdownOpen} = this.state;

    let dropdownClasses = 'up-notification--toggle';
    if (notifications.length !== 0) {
      dropdownClasses += ' up-active';
    }

    return (
      <StyledDropdown
        isOpen={isDropdownOpen}
        toggle={this.toggle}
        className="up-notification"
      >
        <StyledDropdownToggle onClick={this.toggle} className={dropdownClasses}>
          <FontAwesomeIcon icon="bell" />
          &nbsp;
          {this.renderNotificationCount()}
        </StyledDropdownToggle>

        <StyledDropdownMenu className="up-notification--menu">
          <StyledDropdownItem className="up-notification--menu-header" header>
            {t('notifications')}
          </StyledDropdownItem>

          {this.renderNotifications()}

          <StyledDropdownItem
            className="up-notification--menu-footer"
            tag="a"
            href={seeAllNotificationsUrl}
          >
            {t('notifications-see-all')}
          </StyledDropdownItem>
        </StyledDropdownMenu>
      </StyledDropdown>
    );
  };
}

export default translate('notification-icon')(reactTimeout(NotificationIcon));
