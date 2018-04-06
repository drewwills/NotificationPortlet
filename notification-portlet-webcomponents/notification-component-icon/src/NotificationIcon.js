import React, {Component} from 'react';
import {
  Dropdown,
  DropdownMenu,
  DropdownToggle,
  DropdownItem,
} from 'reactstrap';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import {translate} from 'react-i18next';

class NotificationIcon extends Component {
  state = {
    isDropdownOpen: false,
    bearerToken: null,
    notifications: []
  };

  fetchBearerToken = async () => {
    try {
      // TODO: allow override of hard-coded URI
      const response = await fetch('/uPortal/api/v5-1/userinfo', {
        credentials: 'same-origin'
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const bearerToken = await response.text();
      this.setState({bearerToken});
      setTimeout(function() {
        this.setState({bearerToken: null});
      }, /* 3 min */ 180000); // TODO:  configurable?  retry?
    } catch (err) {
      // TODO: add an error view
      console.error(err);
    }

  }

  fetchNotifications = async () => {
    try {
      if (!this.state.bearerToken) {
        await this.fetchBearerToken();
      }
      // TODO: allow override of hard-coded URI
      const response = await fetch('/NotificationPortlet/api/v2/notifications', {
        credentials: 'same-origin',
        headers: {
          'Authorization': 'Bearer ' + this.state.bearerToken,
          'content-type': 'application/jwt'
        }
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
    this.setState({
      isDropdownOpen: !this.state.isDropdownOpen,
    });
  };

  renderNotificationCount = () => {
    const {t} = this.props;
    const {notifications} = this.state;

    const count = notifications.filter(({isRead}) => !isRead).length;

    return (
      <span className="up-notification--notification-count">
        {count}
        <span className="sr-only">{t('notification-count', {count})}</span>
      </span>
    );
  };

  renderNotifications = () => {
    const {t} = this.props;
    const {notifications} = this.state;

    // empty notifications
    if (notifications.length < 1) {
      return (
        <DropdownItem className="up-notification--menu-item" disabled>
          {t('notifications-all-read')}
        </DropdownItem>
      );
    }

    // one or more notifications
    return notifications.map(({url, message, isRead}) => (
      <DropdownItem
        key={message}
        tag="a"
        className={'up-notification--menu-item ' + (isRead ? 'read' : 'unread')}
        href={url}
      >
        {message}
      </DropdownItem>
    ));
  };

  componentDidMount = this.fetchNotifications;

  render = () => {
    const {t} = this.props;
    const {isDropdownOpen} = this.state;

    return (
      <Dropdown
        isOpen={isDropdownOpen}
        toggle={this.toggle}
        className="up-notification"
      >
        <DropdownToggle
          onClick={this.toggle}
          className="up-notification--toggle"
        >
          <FontAwesomeIcon icon="bell" />
          {this.renderNotificationCount()}
        </DropdownToggle>

        <DropdownMenu className="up-notification--menu">
          <DropdownItem className="up-notification--menu-header" header>
            {t('notifications')}
          </DropdownItem>

          {this.renderNotifications()}

          <DropdownItem
            className="up-notification--menu-footer"
            tag="a"
            href="/p/notifications"
            header
          >
            {t('see-all-notifications')}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  };
}

export default translate('translations')(NotificationIcon);
