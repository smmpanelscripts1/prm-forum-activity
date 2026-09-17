(function () {
var app = flarum.core.compat['admin/app'] || flarum.core.compat.app;

app.initializers.add('prm-forum-activity', function () {
  app.extensionData
    .for('prm-forum-activity')
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
