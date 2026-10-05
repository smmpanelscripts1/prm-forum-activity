import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Badge from 'flarum/common/components/Badge';
import Button from 'flarum/common/components/Button';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';
import ForumActivity from './components/ForumActivity';
import { isSearching, t } from './activityUtils';

export { default as extend } from './extend';

app.initializers.add('prm-forum-activity', () => {
  extend('flarum/forum/components/IndexPage', 'view', function (vnode) {
    if (!vnode || !vnode.attrs) {
      return;
    }
    vnode.attrs.className = (vnode.attrs.className || 'IndexPage') + (isSearching() ? ' IndexPage--searching' : '');
  });

  extend('flarum/forum/components/IndexPage', 'contentItems', function (items) {
    if (isSearching()) {
      return;
    }
    items.remove('toolbar');
    if (items.has('discussionList')) {
      items.setContent('discussionList', <ForumActivity />);
    } else {
      items.add('discussionList', <ForumActivity />, 90);
    }
  });

  extend('flarum/common/models/Discussion', 'badges', function (items) {
    if (this.isFeatured && this.isFeatured()) {
      items.add(
        'featured',
        <Badge type="featured" icon="fas fa-star" label={t('badge.featured_tooltip')} />,
        8
      );
    }
  });

  extend(DiscussionControls, 'moderationControls', function (items, discussion) {
    if (!discussion.canFeature || !discussion.canFeature()) {
      return;
    }
    const featured = discussion.isFeatured && discussion.isFeatured();
    items.add(
      'feature',
      <Button
        icon="fas fa-star"
        onclick={() => {
          discussion.save({ isFeatured: !featured }).then(() => m.redraw());
        }}
      >
        {t(featured ? 'discussion_controls.unfeature' : 'discussion_controls.feature')}
      </Button>
    );
  });
});
