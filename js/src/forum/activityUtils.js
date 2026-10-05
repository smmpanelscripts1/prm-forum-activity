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
