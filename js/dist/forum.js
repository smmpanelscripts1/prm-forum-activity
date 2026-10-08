(function () {
var app = flarum.core.compat['forum/app'] || flarum.core.compat.app;
var extendMod = flarum.core.compat['common/extend'] || {};
var extend = extendMod.extend;
var Model = flarum.core.compat['common/Model'];
var Discussion = flarum.core.compat['common/models/Discussion'];
var Badge = flarum.core.compat['common/components/Badge'];
var Button = flarum.core.compat['common/components/Button'];
var Link = flarum.core.compat['common/components/Link'];
var LoadingIndicator = flarum.core.compat['common/components/LoadingIndicator'];
var IndexPage = flarum.core.compat['forum/components/IndexPage'];
var DiscussionControls = flarum.core.compat['forum/utils/DiscussionControls'];
var avatar = flarum.core.compat['common/helpers/avatar'];
var username = flarum.core.compat['common/helpers/username'];
var icon = flarum.core.compat['common/helpers/icon'];
var humanTime = flarum.core.compat['common/helpers/humanTime'];
var extractText = flarum.core.compat['common/utils/extractText'];
var tagsLabel = flarum.core.compat['tags/helpers/tagsLabel'];
var m = window.m;

function t(key, params) {
  return app.translator.trans('prm-forum-activity.forum.' + key, params || {});
}

function isSearching() {
  return !!(app.search && app.search.params() && app.search.params().q);
}

function currentTagSlug() {
  var params = app.search && app.search.params ? app.search.params() : {};
  return params.tags || null;
}

function discussionTags(discussion) {
  if (!discussion.tags) {
    return [];
  }
  return discussion.tags() || [];
}

function forumTag(discussion) {
  var tags = discussionTags(discussion);
  var i;
  var child = null;
  for (i = 0; i < tags.length; i++) {
    if (tags[i] && tags[i].isChild && tags[i].isChild()) {
      child = tags[i];
      break;
    }
  }
  return child || tags[0] || null;
}

function lastPostHref(discussion) {
  var number = discussion.lastPostNumber && discussion.lastPostNumber();
  return app.route.discussion(discussion, number || undefined);
}

var TABS = ['latest', 'featured', 'newest', 'popular'];

function resolveDefaultTab() {
  if (typeof localStorage !== 'undefined') {
    var saved = localStorage.getItem('prmForumActivityTab');
    if (saved && TABS.indexOf(saved) !== -1) {
      return saved;
    }
  }

  var fromAdmin = app.forum.attribute('prmForumActivityDefaultTab');
  if (fromAdmin && TABS.indexOf(fromAdmin) !== -1) {
    return fromAdmin;
  }

  return 'latest';
}

class ForumActivity {
  oninit() {
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

  onremove() {
    this.stopTimer();
  }

  startTimer() {
    var self = this;
    this.stopTimer();
    this.elapsed = 0;
    this.timer = setInterval(function () {
      self.elapsed += 1;
      if (self.elapsed >= 60) {
        self.load(true);
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
    var filter = {};
    var tag = currentTagSlug();
    if (tag) {
      filter.tag = tag;
    }
    return filter;
  }

  include() {
    return 'user,lastPostedUser,tags,tags.parent';
  }

  load(reset) {
    var self = this;
    if (reset) {
      this.offset = 0;
      this.loading = true;
      this.stickies = [];
      this.discussions = [];
      this.elapsed = 0;
    } else {
      this.loadingMore = true;
    }

    var requests = [this.fetchPage(false, this.offset)];
    if (reset && this.tab !== 'featured') {
      requests.unshift(this.fetchStickies());
    }

    Promise.all(requests)
      .then(function (results) {
        if (reset && self.tab !== 'featured') {
          self.stickies = results[0] || [];
          self.applyPage(results[1] || [], reset);
        } else {
          self.applyPage(results[0] || [], reset);
        }
        self.loading = false;
        self.loadingMore = false;
        if (reset) {
          self.startTimer();
        }
        m.redraw();
      })
      .catch(function () {
        self.loading = false;
        self.loadingMore = false;
        m.redraw();
      });
  }

  applyPage(items, reset) {
    var list = items || [];
    this.hasMore = list.length >= this.limit;
    if (reset) {
      this.discussions = list;
    } else {
      this.discussions = this.discussions.concat(list);
    }
    this.offset = this.discussions.length;
  }

  fetchStickies() {
    var filter = this.baseFilter();
    filter.sticky = '1';
    return app.store.find('discussions', {
      filter: filter,
      sort: this.sortValue(),
      include: this.include(),
      page: { limit: 50 },
    });
  }

  fetchPage(featuredOnly, offset) {
    var filter = this.baseFilter();
    if (this.tab === 'featured') {
      filter.featured = '1';
    } else {
      filter['-sticky'] = '1';
    }
    return app.store.find('discussions', {
      filter: filter,
      sort: this.sortValue(),
      include: this.include(),
      page: { offset: offset || 0, limit: this.limit },
    });
  }

  view() {
    return m('div.ForumActivity', [
      m('div.ForumActivity-head', [
        m('h2.ForumActivity-title', t('title')),
        m(
          Button,
          {
            className: 'Button Button--icon ForumActivity-toggle',
            icon: this.collapsed ? 'fas fa-plus' : 'fas fa-minus',
            onclick: this.toggle.bind(this),
          }
        ),
      ]),
      this.collapsed ? null : this.bodyView(),
    ]);
  }

  bodyView() {
    return [
      m('div.ForumActivity-tabs', [
        this.tabButton('latest', 'fas fa-comments'),
        this.tabButton('featured', 'fas fa-star'),
        this.tabButton('newest', 'fas fa-comment'),
        this.tabButton('popular', 'fas fa-fire'),
      ]),
      this.loading ? m(LoadingIndicator) : this.tableView(),
      this.loading ? null : m('div.ForumActivity-foot', [
        this.hasMore
          ? m(
              Button,
              {
                className: 'Button',
                loading: this.loadingMore,
                onclick: this.load.bind(this, false),
              },
              t('load_more')
            )
          : null,
        m('span.ForumActivity-timer', '(' + this.elapsed + 's)'),
        m(
          Button,
          {
            className: 'Button Button--icon',
            icon: 'fas fa-sync',
            onclick: this.load.bind(this, true),
          }
        ),
      ]),
    ];
  }

  tabButton(tab, iconName) {
    var self = this;
    return m(
      Button,
      {
        className: 'Button ForumActivity-tab' + (this.tab === tab ? ' is-active Button--primary' : ''),
        icon: iconName,
        onclick: function () {
          self.setTab(tab);
        },
      },
      t('tabs.' + tab)
    );
  }

  tableView() {
    var stickies = this.tab === 'featured' ? [] : this.stickies;
    var normals = this.discussions;
    var rows = [];
    var index = 1;
    var self = this;

    if (!stickies.length && !normals.length) {
      return m('div.ForumActivity-empty', t('empty'));
    }

    if (stickies.length) {
      rows.push(this.sectionRow(t('sticky_section')));
      stickies.forEach(function (discussion) {
        rows.push(self.row(discussion, index, true));
        index += 1;
      });
    }

    if (normals.length) {
      if (this.tab !== 'featured') {
        rows.push(this.sectionRow(t('normal_section')));
      }
      normals.forEach(function (discussion) {
        rows.push(self.row(discussion, index, false));
        index += 1;
      });
    }

    return m('div.ForumActivity-tableWrap', m('table.ForumActivity-table', [
      m('thead', m('tr', [
        m('th.ForumActivity-colIndex', '#'),
        m('th.ForumActivity-colTopic', t('columns.topic')),
        m('th.ForumActivity-colForum', t('columns.forum')),
        m('th.ForumActivity-colPosts', t('columns.posts')),
        m('th.ForumActivity-colLast', t('columns.last_poster')),
      ])),
      m('tbody', rows),
    ]));
  }

  sectionRow(label) {
    return m('tr.ForumActivity-sectionHead', m('td', { colspan: 5 }, label));
  }

  row(discussion, index, inStickySection) {
    var unread = discussion.isUnread && discussion.isUnread();
    var lastUser = discussion.lastPostedUser && discussion.lastPostedUser();
    var tag = forumTag(discussion);
    var locked = discussion.isLocked && discussion.isLocked();
    var sticky = discussion.isSticky && discussion.isSticky();
    var featured = discussion.isFeatured && discussion.isFeatured();
    var replyCount = discussion.replyCount ? discussion.replyCount() : Math.max(0, (discussion.commentCount() || 1) - 1);
    var icons = [];

    if (sticky) {
      icons.push(icon('fas fa-thumbtack', { className: 'ForumActivity-icon' }));
    }
    if (locked) {
      icons.push(icon('fas fa-lock', { className: 'ForumActivity-icon' }));
    }
    if (featured) {
      icons.push(icon('fas fa-star', { className: 'ForumActivity-icon' }));
    }

    return m(
      'tr.ForumActivity-row',
      {
        className: unread ? 'is-unread' : '',
        'data-id': discussion.id(),
      },
      [
        m('td.ForumActivity-colIndex', String(index)),
        m('td.ForumActivity-colTopic', m('div.ForumActivity-topic', [
          icons.length ? m('span.ForumActivity-icons', icons) : null,
          m(Link, { className: 'ForumActivity-titleLink', href: lastPostHref(discussion) }, discussion.title()),
        ])),
        m(
          'td.ForumActivity-colForum',
          tag
            ? m(Link, { href: app.route.tag ? app.route.tag(tag) : app.route('tag', { tags: tag.slug() }) }, tag.name())
            : tagsLabel
              ? tagsLabel(discussionTags(discussion), { link: true })
              : null
        ),
        m(
          'td.ForumActivity-colPosts',
          { className: 'ForumActivity-posts' + (inStickySection ? ' is-sticky' : '') },
          inStickySection ? t('sticky_label') : String(replyCount)
        ),
        m('td.ForumActivity-colLast', m('div.ForumActivity-last', [
          lastUser ? m(Link, { href: app.route.user(lastUser) }, avatar(lastUser)) : null,
          m('div.ForumActivity-lastMeta', [
            lastUser
              ? m(Link, { className: 'ForumActivity-lastName', href: app.route.user(lastUser) }, username(lastUser))
              : m('span.ForumActivity-lastName', '—'),
            discussion.lastPostedAt()
              ? m(Link, { className: 'ForumActivity-lastTime', href: lastPostHref(discussion) }, humanTime(discussion.lastPostedAt()))
              : null,
          ]),
        ])),
      ]
    );
  }
}

app.initializers.add('prm-forum-activity', function () {
  Discussion.prototype.isFeatured = Model.attribute('isFeatured');
  Discussion.prototype.canFeature = Model.attribute('canFeature');

  extend(IndexPage.prototype, 'view', function (vnode) {
    if (!vnode || !vnode.attrs) {
      return;
    }
    vnode.attrs.className = (vnode.attrs.className || 'IndexPage') + (isSearching() ? ' IndexPage--searching' : '');
  });

  extend(IndexPage.prototype, 'contentItems', function (items) {
    if (isSearching()) {
      return;
    }
    items.remove('toolbar');
    if (items.has('discussionList')) {
      items.setContent('discussionList', m(ForumActivity));
    } else {
      items.add('discussionList', m(ForumActivity), 90);
    }
  });

  extend(Discussion.prototype, 'badges', function (items) {
    if (this.isFeatured && this.isFeatured()) {
      items.add(
        'featured',
        m(Badge, {
          type: 'featured',
          icon: 'fas fa-star',
          label: t('badge.featured_tooltip'),
        }),
        8
      );
    }
  });

  extend(DiscussionControls, 'moderationControls', function (items, discussion) {
    if (!discussion.canFeature || !discussion.canFeature()) {
      return;
    }
    var featured = discussion.isFeatured && discussion.isFeatured();
    items.add(
      'feature',
      m(
        Button,
        {
          icon: 'fas fa-star',
          onclick: function () {
            discussion.save({ isFeatured: !featured }).then(function () {
              m.redraw();
            });
          },
        },
        t(featured ? 'discussion_controls.unfeature' : 'discussion_controls.feature')
      )
    );
  });
});

module.exports = {};
})();
