(function () {
var app = flarum.core.compat['admin/app'] || flarum.core.compat.app;

function t(key) {
  return app.translator.trans('prm-forum-activity.admin.settings.' + key);
}

app.initializers.add('prm-forum-activity', function () {
  app.extensionData
    .for('prm-forum-activity')
    .registerSetting({
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
    })
    .registerPermission(
      {
        icon: 'fas fa-star',
        label: app.translator.trans('prm-forum-activity.admin.permissions.feature_label'),
        permission: 'discussion.feature',
      },
      'moderate'
    );
});

module.exports = {};
})();
