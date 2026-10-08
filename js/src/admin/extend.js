import app from 'flarum/admin/app';
import Extend from 'flarum/common/extenders';

function t(key) {
  return app.translator.trans('prm-forum-activity.admin.settings.' + key);
}

export default [
  new Extend.Admin()
    .setting(() => ({
      setting: 'prm-forum-activity.default_tab',
      type: 'select',
      label: t('default_tab_label'),
      help: t('default_tab_help'),
      options: {
        latest: t('default_tab_latest'),
        featured: t('default_tab_featured'),
        newest: t('default_tab_newest'),
        popular: t('default_tab_popular'),
      },
      default: 'latest',
    }))
    .setting(() => ({
      setting: 'prm-forum-activity.color_mode',
      type: 'select',
      label: t('color_mode_label'),
      help: t('color_mode_help'),
      options: {
        default: t('color_mode_default'),
        theme: t('color_mode_theme'),
        tag: t('color_mode_tag'),
        manual: t('color_mode_manual'),
      },
      default: 'default',
    }))
    .setting(() => ({
      setting: 'prm-forum-activity.accent_color',
      type: 'text',
      label: t('accent_color_label'),
      help: t('accent_color_help'),
      default: '#2d8a4e',
    }))
    .setting(() => ({
      setting: 'prm-forum-activity.color_rows',
      type: 'boolean',
      label: t('color_rows_label'),
      help: t('color_rows_help'),
    }))
    .setting(() => ({
      setting: 'prm-forum-activity.sticky_highlight',
      type: 'boolean',
      label: t('sticky_highlight_label'),
      help: t('sticky_highlight_help'),
      default: true,
    }))
    .permission(
      () => ({
        icon: 'fas fa-star',
        label: app.translator.trans('prm-forum-activity.admin.permissions.feature_label'),
        permission: 'discussion.feature',
      }),
      'moderate'
    ),
];
