import app from 'flarum/forum/app';

export function t(key, params) {
  return app.translator.trans('prm-forum-activity.forum.' + key, params || {});
}

function searchParams() {
  if (!app.search || !app.search.state) {
    return {};
  }

  return app.search.state.params() || {};
}

export function isSearching() {
  return !!searchParams().q;
}

export function currentTagSlug() {
  return searchParams().tags || null;
}

export function currentPrefixSlug() {
  return searchParams().prefix || null;
}

export function currentTag() {
  const slug = currentTagSlug();
  if (!slug || !app.store) {
    return null;
  }
  return (app.store.all('tags') || []).find((tag) => tag.slug && tag.slug() === slug) || null;
}

/** Tabs keyed like core sort keys; `popular` was renamed to core's `top` in 2.2. */
const LEGACY_TABS = { popular: 'top' };
const TAB_ORDER = ['latest', 'featured', 'newest', 'top', 'oldest', 'az', 'za'];
const OWN_LABELS = ['latest', 'featured', 'newest', 'top'];
const TAB_ICONS = {
  latest: 'fas fa-comments',
  featured: 'fas fa-star',
  newest: 'fas fa-comment',
  top: 'fas fa-fire',
  oldest: 'fas fa-history',
  az: 'fas fa-sort-alpha-down',
  za: 'fas fa-sort-alpha-up',
};

export function normalizeTab(tab) {
  return LEGACY_TABS[tab] || tab || null;
}

/** Core sort map plus any sorts other extensions registered (Trending, Upvotes, …). */
export function sortMap() {
  const map = Object.assign({}, (app.discussions && app.discussions.sortMap()) || {});
  delete map.relevance;
  return map;
}

export function disabledTabs() {
  const raw = app.forum.attribute('prmForumActivityDisabledTabs');
  return Array.isArray(raw) ? raw.map(normalizeTab) : [];
}

export function availableTabs() {
  const keys = ['featured'].concat(Object.keys(sortMap()));
  const rank = (key) => (TAB_ORDER.indexOf(key) === -1 ? TAB_ORDER.length : TAB_ORDER.indexOf(key));
  const ordered = keys
    .map((key, i) => ({ key, i }))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.i - b.i)
    .map((item) => item.key);

  const disabled = disabledTabs();
  const enabled = ordered.filter((key) => disabled.indexOf(key) === -1);

  return enabled.length ? enabled : ['latest'];
}

export function tabSort(tab) {
  if (tab === 'featured') {
    return '-lastPostedAt';
  }
  const sort = sortMap()[tab];
  if (typeof sort === 'string' && sort) {
    return sort;
  }
  if (sort && typeof sort === 'object' && sort.sort) {
    return sort.sort;
  }
  return '-lastPostedAt';
}

export function tabIcon(tab) {
  return TAB_ICONS[tab] || 'fas fa-sort';
}

export function tabLabel(tab) {
  if (OWN_LABELS.indexOf(tab) !== -1) {
    return t('tabs.' + tab);
  }

  const sort = sortMap()[tab];
  if (sort && typeof sort === 'object' && sort.label) {
    return sort.label;
  }

  const keys = ['core.forum.index_sort.' + tab + '_button', 'core.lib.index_sort.' + tab + '_button'];
  for (let i = 0; i < keys.length; i++) {
    const label = app.translator.trans(keys[i]);
    if (label && label !== keys[i]) {
      return label;
    }
  }
  return tab;
}

/** Soft compat with ernestdefoe/rubric — prefixes ship on the forum payload. */
export function findRubricPrefix(discussion) {
  if (!discussion || typeof discussion.attribute !== 'function') {
    return null;
  }
  const id = discussion.attribute('rubricPrefixId');
  if (id === null || id === undefined) {
    return null;
  }
  const list = (app.forum && app.forum.attribute('rubricPrefixes')) || [];
  return list.find((p) => String(p.id) === String(id)) || null;
}

export function rubricTextColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) {
    return '#fff';
  }
  const n = parseInt(m[1], 16);
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return L > 0.179 ? '#111827' : '#fff';
}

export function stickyTagIds(discussion) {
  const ids = typeof discussion.attribute === 'function' ? discussion.attribute('stickyTagIds') : null;
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.map(String);
}

export function discussionTags(discussion) {
  if (!discussion.tags) {
    return [];
  }
  return discussion.tags() || [];
}

export function forumTag(discussion) {
  const tags = discussionTags(discussion);
  let child = null;
  for (let i = 0; i < tags.length; i++) {
    if (tags[i] && tags[i].isChild && tags[i].isChild()) {
      child = tags[i];
      break;
    }
  }
  return child || tags[0] || null;
}

export function lastPostHref(discussion) {
  const number = discussion.lastPostNumber && discussion.lastPostNumber();
  return app.route.discussion(discussion, number || undefined);
}

export function hasStickiest() {
  return (
    app.forum.attribute('huseyinfiliz-stickiest.stickiest_icon') != null ||
    app.forum.attribute('huseyinfiliz-stickiest.show_tag_sticky_in_all') != null
  );
}

export function boolAttr(discussion, name) {
  if (!discussion) {
    return false;
  }
  if (typeof discussion[name] === 'function') {
    return !!discussion[name]();
  }
  if (typeof discussion.attribute === 'function') {
    return !!discussion.attribute(name);
  }
  return false;
}

export function isSuperSticky(discussion) {
  return boolAttr(discussion, 'isStickiest');
}

export function isTagSticky(discussion) {
  return boolAttr(discussion, 'isTagSticky');
}

export function isCoreSticky(discussion) {
  return boolAttr(discussion, 'isSticky');
}

export function tagStickyApplies(discussion) {
  if (!isTagSticky(discussion)) {
    return false;
  }

  const tagSlug = currentTagSlug();
  const showInAll = !!app.forum.attribute('huseyinfiliz-stickiest.show_tag_sticky_in_all');

  if (!tagSlug) {
    return showInAll;
  }

  const ids = stickyTagIds(discussion);
  if (!ids.length || !app.store) {
    return false;
  }

  const tags = app.store.all('tags') || [];
  const current = tags.find((tag) => tag.slug && tag.slug() === tagSlug);
  if (current) {
    return ids.indexOf(String(current.id())) !== -1;
  }

  return ids.some((id) => {
    const tag = app.store.getById('tags', String(id));
    return tag && tag.slug && tag.slug() === tagSlug;
  });
}

export function isPinned(discussion) {
  if (isCoreSticky(discussion) || isSuperSticky(discussion)) {
    return true;
  }
  return hasStickiest() && tagStickyApplies(discussion);
}

export function pinRank(discussion) {
  if (isSuperSticky(discussion)) {
    return 3;
  }
  if (hasStickiest() && tagStickyApplies(discussion)) {
    return 2;
  }
  if (isCoreSticky(discussion)) {
    return 1;
  }
  return 0;
}

export function resolveAccentColor() {
  const mode = app.forum.attribute('prmForumActivityColorMode') || 'default';

  if (mode === 'theme') {
    return app.forum.attribute('themePrimaryColor') || '#4D698E';
  }

  if (mode === 'manual') {
    return app.forum.attribute('prmForumActivityAccentColor') || '#2d8a4e';
  }

  if (mode === 'tag') {
    const slug = currentTagSlug();
    if (slug && app.store) {
      const tags = app.store.all('tags') || [];
      const tag = tags.find((item) => item.slug && item.slug() === slug);
      if (tag && tag.color && tag.color()) {
        return tag.color();
      }
    }
    return app.forum.attribute('themePrimaryColor') || '#2d8a4e';
  }

  return '#2d8a4e';
}

export function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '');
  if (raw.length !== 3 && raw.length !== 6) {
    return null;
  }
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) {
    return null;
  }
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}
