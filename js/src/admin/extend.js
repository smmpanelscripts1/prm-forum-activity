import app from 'flarum/admin/app';
import Extend from 'flarum/common/extenders';

export default [
  new Extend.Admin().permission(
    () => ({
      icon: 'fas fa-star',
      label: app.translator.trans('prm-forum-activity.admin.permissions.feature_label'),
      permission: 'discussion.feature',
    }),
    'moderate'
  ),
];
