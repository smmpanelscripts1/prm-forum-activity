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

  if (discussion.stickyTags && typeof discussion.stickyTags === 'function') {
    const stickyTags = discussion.stickyTags() || [];
    if (stickyTags.some((tag) => tag && tag.slug && tag.slug() === tagSlug)) {
      return true;
    }
  }

  const ids = typeof discussion.attribute === 'function' ? discussion.attribute('stickyTagIds') : null;
  if (Array.isArray(ids) && ids.length && app.store) {
    return ids.some((id) => {
      const tag = app.store.getById('tags', String(id));
      return tag && tag.slug && tag.slug() === tagSlug;
    });
  }

  // Fallback: treat as applicable on tag pages when Stickiest is present.
  return true;
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
