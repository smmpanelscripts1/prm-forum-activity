import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Link from 'flarum/common/components/Link';
import Icon from 'flarum/common/components/Icon';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Avatar from 'flarum/common/components/Avatar';
import username from 'flarum/common/helpers/username';
import humanTime from 'flarum/common/helpers/humanTime';
import {
  t,
  currentTagSlug,
  forumTag,
  lastPostHref,
  hasStickiest,
  isSuperSticky,
  isTagSticky,
  isCoreSticky,
  isPinned,
  pinRank,
  tagStickyApplies,
  resolveAccentColor,
  hexToRgba,
} from '../activityUtils';

const TABS = ['latest', 'featured', 'newest', 'popular'];

function resolveDefaultTab() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('prmForumActivityTab');
    if (saved && TABS.indexOf(saved) !== -1) {
      return saved;
    }
  }

  const fromAdmin = app.forum.attribute('prmForumActivityDefaultTab');
  if (fromAdmin && TABS.indexOf(fromAdmin) !== -1) {
    return fromAdmin;
  }

  return 'latest';
}

function uniqueDiscussions(lists) {
  const seen = {};
  const out = [];
  lists.forEach((list) => {
    (list || []).forEach((discussion) => {
      const id = discussion.id();
      if (seen[id]) {
        return;
      }
      seen[id] = true;
      out.push(discussion);
    });
  });
  return out;
}

export default class ForumActivity extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.tab = resolveDefaultTab();
    this.collapsed = typeof localStorage !== 'undefined' && localStorage.getItem('prmForumActivityCollapsed') === '1';
    this.stickies = [];
    this.discussions = [];
    this.loading = true;
    this.loadingMore = false;
    this.hasMore = false;
    this.offset = 0;
    this.limit = 20;
    this.elapsed = 0;
    this.timer = null;
    this.load(true);
    this.startTimer();
  }

  onremove(vnode) {
    super.onremove(vnode);
    this.stopTimer();
  }

  startTimer() {
    this.stopTimer();
    this.elapsed = 0;
    this.timer = setInterval(() => {
      this.elapsed += 1;
      if (this.elapsed >= 60) {
        this.load(true);
        return;
      }
      m.redraw();
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setTab(tab) {
    this.tab = tab;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('prmForumActivityTab', tab);
    }
    this.load(true);
  }

  toggle() {
    this.collapsed = !this.collapsed;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('prmForumActivityCollapsed', this.collapsed ? '1' : '0');
    }
  }

  sortValue() {
    if (this.tab === 'newest') {
      return '-createdAt';
    }
    if (this.tab === 'popular') {
      return '-commentCount';
    }
    return '-lastPostedAt';
  }

  baseFilter() {
    const filter = {};
    const tag = currentTagSlug();
    if (tag) {
      filter.tag = tag;
    }
    return filter;
  }

  include() {
    let include = 'user,lastPostedUser,tags,tags.parent';
    if (hasStickiest()) {
      include += ',stickyTags';
    }
    return include;
  }

  load(reset) {
    if (reset) {
      this.offset = 0;
      this.loading = true;
      this.stickies = [];
      this.discussions = [];
      this.elapsed = 0;
    } else {
      this.loadingMore = true;
    }

    const requests = [this.fetchPage(this.offset)];
    if (reset && this.tab !== 'featured') {
      requests.unshift(this.fetchStickies());
    }

    Promise.all(requests)
      .then((results) => {
        if (reset && this.tab !== 'featured') {
          this.stickies = results[0] || [];
          this.applyPage(results[1] || [], reset);
        } else {
          this.applyPage(results[0] || [], reset);
        }
        this.loading = false;
        this.loadingMore = false;
        if (reset) {
          this.startTimer();
        }
        m.redraw();
      })
      .catch(() => {
        this.loading = false;
        this.loadingMore = false;
        m.redraw();
      });
  }

  applyPage(items, reset) {
    const stickyIds = {};
    (this.stickies || []).forEach((d) => {
      stickyIds[d.id()] = true;
    });

    const list = (items || []).filter((discussion) => {
      if (stickyIds[discussion.id()]) {
        return false;
      }
      // Avoid duplicating Stickiest pins in the normal section.
      if (this.tab !== 'featured' && isPinned(discussion)) {
        return false;
      }
      return true;
    });

    this.hasMore = (items || []).length >= this.limit;
    if (reset) {
      this.discussions = list;
    } else {
      this.discussions = this.discussions.concat(list);
    }
    this.offset = (reset ? 0 : this.offset) + (items || []).length;
  }

  fetchStickies() {
    const filter = this.baseFilter();
    const requests = [
      app.store.find('discussions', {
        filter: Object.assign({}, filter, { sticky: '1' }),
        sort: this.sortValue(),
        include: this.include(),
        page: { limit: 50 },
      }),
    ];

    if (hasStickiest()) {
      requests.push(
        app.store.find('discussions', {
          filter: Object.assign({}, filter, { prmStickiest: '1' }),
          sort: this.sortValue(),
          include: this.include(),
          page: { limit: 50 },
        })
      );

      const showTagStickyInAll = !!app.forum.attribute('huseyinfiliz-stickiest.show_tag_sticky_in_all');
      if (currentTagSlug() || showTagStickyInAll) {
        requests.push(
          app.store.find('discussions', {
            filter: Object.assign({}, filter, { prmTagSticky: '1' }),
            sort: this.sortValue(),
            include: this.include(),
            page: { limit: 50 },
          })
        );
      }
    }

    return Promise.all(requests).then((results) => {
      const merged = uniqueDiscussions(results).filter((discussion) => {
        if (isSuperSticky(discussion) || isCoreSticky(discussion)) {
          return true;
        }
        return tagStickyApplies(discussion);
      });

      merged.sort((a, b) => pinRank(b) - pinRank(a));
      return merged;
    });
  }

  fetchPage(offset) {
    const filter = this.baseFilter();
    if (this.tab === 'featured') {
      filter.featured = '1';
    } else {
      filter['-sticky'] = '1';
    }
    return app.store.find('discussions', {
      filter,
      sort: this.sortValue(),
      include: this.include(),
      page: { offset: offset || 0, limit: this.limit },
    });
  }

  rootStyle() {
    const accent = resolveAccentColor();
    const section = hexToRgba(accent, 1) || accent;
    return {
      '--fa-accent': accent,
      '--fa-accent-soft': hexToRgba(accent, 0.12) || accent,
      '--fa-section-bg': section,
    };
  }

  view() {
    return (
      <div className="ForumActivity" style={this.rootStyle()}>
        <div className="ForumActivity-head">
          <h2 className="ForumActivity-title">{t('title')}</h2>
          <Button
            className="Button Button--icon ForumActivity-toggle"
            icon={this.collapsed ? 'fas fa-plus' : 'fas fa-minus'}
            onclick={this.toggle.bind(this)}
          />
        </div>
        {this.collapsed ? null : this.bodyView()}
      </div>
    );
  }

  bodyView() {
    return [
      <div className="ForumActivity-tabs">
        {this.tabButton('latest', 'fas fa-comments')}
        {this.tabButton('featured', 'fas fa-star')}
        {this.tabButton('newest', 'fas fa-comment')}
        {this.tabButton('popular', 'fas fa-fire')}
      </div>,
      this.loading ? <LoadingIndicator /> : this.tableView(),
      this.loading ? null : (
        <div className="ForumActivity-foot">
          {this.hasMore ? (
            <Button className="Button" loading={this.loadingMore} onclick={() => this.load(false)}>
              {t('load_more')}
            </Button>
          ) : null}
          <span className="ForumActivity-timer">({this.elapsed}s)</span>
          <Button className="Button Button--icon" icon="fas fa-sync" onclick={() => this.load(true)} />
        </div>
      ),
    ];
  }

  tabButton(tab, iconName) {
    return (
      <Button
        className={'Button ForumActivity-tab' + (this.tab === tab ? ' is-active Button--primary' : '')}
        icon={iconName}
        onclick={() => this.setTab(tab)}
      >
        {t('tabs.' + tab)}
      </Button>
    );
  }

  tableView() {
    const stickies = this.tab === 'featured' ? [] : this.stickies;
    const normals = this.discussions;
    const rows = [];
    let index = 1;

    if (!stickies.length && !normals.length) {
      return <div className="ForumActivity-empty">{t('empty')}</div>;
    }

    if (stickies.length) {
      rows.push(this.sectionRow(t('sticky_section')));
      stickies.forEach((discussion) => {
        rows.push(this.row(discussion, index, true));
        index += 1;
      });
    }

    if (normals.length) {
      if (this.tab !== 'featured') {
        rows.push(this.sectionRow(t('normal_section')));
      }
      normals.forEach((discussion) => {
        rows.push(this.row(discussion, index, false));
        index += 1;
      });
    }

    return (
      <div className="ForumActivity-tableWrap">
        <table className="ForumActivity-table">
          <thead>
            <tr>
              <th className="ForumActivity-colIndex">#</th>
              <th className="ForumActivity-colTopic">{t('columns.topic')}</th>
              <th className="ForumActivity-colForum">{t('columns.forum')}</th>
              <th className="ForumActivity-colPosts">{t('columns.posts')}</th>
              <th className="ForumActivity-colLast">{t('columns.last_poster')}</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }

  sectionRow(label) {
    return (
      <tr className="ForumActivity-sectionHead">
        <td colspan={5}>{label}</td>
      </tr>
    );
  }

  rowStyle(discussion) {
    const style = {};
    const colorRows = !!app.forum.attribute('prmForumActivityColorRows');
    const stickyHighlight = app.forum.attribute('prmForumActivityStickyHighlight') !== false;
    const tag = forumTag(discussion);

    if (colorRows && tag && tag.color && tag.color()) {
      const tint = hexToRgba(tag.color(), 0.08);
      if (tint) {
        style.background = tint;
        style.boxShadow = 'inset 3px 0 0 ' + tag.color();
      }
    } else if (stickyHighlight) {
      if (isSuperSticky(discussion)) {
        style.boxShadow = 'inset 3px 0 0 #e74c3c';
        style.background = 'rgba(231, 76, 60, 0.05)';
      } else if (isTagSticky(discussion) && tagStickyApplies(discussion)) {
        style.boxShadow = 'inset 3px 0 0 #3498db';
        style.background = 'rgba(52, 152, 219, 0.05)';
      } else if (isCoreSticky(discussion)) {
        style.boxShadow = 'inset 3px 0 0 #f39c12';
      }
    }

    return style;
  }

  row(discussion, index, inStickySection) {
    const unread = discussion.isUnread && discussion.isUnread();
    const lastUser = discussion.lastPostedUser && discussion.lastPostedUser();
    const tag = forumTag(discussion);
    const locked = discussion.isLocked && discussion.isLocked();
    const sticky = isCoreSticky(discussion);
    const featured = discussion.isFeatured && discussion.isFeatured();
    const replyCount = discussion.replyCount ? discussion.replyCount() : Math.max(0, (discussion.commentCount() || 1) - 1);
    const icons = [];
    const stickiestIcon = app.forum.attribute('huseyinfiliz-stickiest.stickiest_icon') || 'fas fa-star';

    if (isSuperSticky(discussion)) {
      icons.push(<Icon name={stickiestIcon} className="ForumActivity-icon ForumActivity-icon--super" />);
    } else if (isTagSticky(discussion) && tagStickyApplies(discussion)) {
      icons.push(<Icon name="fas fa-tags" className="ForumActivity-icon ForumActivity-icon--tag" />);
    } else if (sticky) {
      icons.push(<Icon name="fas fa-thumbtack" className="ForumActivity-icon" />);
    }
    if (locked) {
      icons.push(<Icon name="fas fa-lock" className="ForumActivity-icon" />);
    }
    if (featured) {
      icons.push(<Icon name="fas fa-star" className="ForumActivity-icon" />);
    }

    const className =
      'ForumActivity-row' +
      (unread ? ' is-unread' : '') +
      (isSuperSticky(discussion) ? ' ForumActivity-row--superSticky' : '') +
      (isTagSticky(discussion) && tagStickyApplies(discussion) ? ' ForumActivity-row--tagSticky' : '') +
      (sticky && !isSuperSticky(discussion) ? ' ForumActivity-row--sticky' : '');

    return (
      <tr className={className} data-id={discussion.id()} style={this.rowStyle(discussion)}>
        <td className="ForumActivity-colIndex">{String(index)}</td>
        <td className="ForumActivity-colTopic">
          <div className="ForumActivity-topic">
            {icons.length ? <span className="ForumActivity-icons">{icons}</span> : null}
            <Link className="ForumActivity-titleLink" href={lastPostHref(discussion)}>
              {discussion.title()}
            </Link>
          </div>
        </td>
        <td className="ForumActivity-colForum">
          {tag ? <Link href={app.route('tag', { tags: tag.slug() })}>{tag.name()}</Link> : '—'}
        </td>
        <td className={'ForumActivity-colPosts ForumActivity-posts' + (inStickySection ? ' is-sticky' : '')}>
          {inStickySection ? t('sticky_label') : String(replyCount)}
        </td>
        <td className="ForumActivity-colLast">
          <div className="ForumActivity-last">
            {lastUser ? (
              <Link href={app.route.user(lastUser)}>
                <Avatar user={lastUser} />
              </Link>
            ) : null}
            <div className="ForumActivity-lastMeta">
              {lastUser ? (
                <Link className="ForumActivity-lastName" href={app.route.user(lastUser)}>
                  {username(lastUser)}
                </Link>
              ) : (
                <span className="ForumActivity-lastName">—</span>
              )}
              {discussion.lastPostedAt() ? (
                <Link className="ForumActivity-lastTime" href={lastPostHref(discussion)}>
                  {humanTime(discussion.lastPostedAt())}
                </Link>
              ) : null}
            </div>
          </div>
        </td>
      </tr>
    );
  }
}
