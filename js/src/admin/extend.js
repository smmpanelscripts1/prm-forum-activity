import app from 'flarum/admin/app';
import Extend from 'flarum/common/extenders';
import Switch from 'flarum/common/components/Switch';
import extractText from 'flarum/common/utils/extractText';

function t(key) {
  return app.translator.trans('prm-forum-activity.admin.settings.' + key);
}

const OWN_LABELS = ['latest', 'featured', 'newest', 'top'];
const TAB_ORDER = ['latest', 'featured', 'newest', 'top', 'oldest', 'az', 'za'];
const DISABLED_KEY = 'prm-forum-activity.disabled_tabs';

function tabKeys() {
  const sorts = (app.data.sortMaps && app.data.sortMaps.discussions) || {};
  const keys = ['featured'].concat(Object.keys(sorts).filter((key) => key !== 'relevance'));
  if (keys.indexOf('latest') === -1) {
    keys.push('latest');
  }
  const rank = (key) => (TAB_ORDER.indexOf(key) === -1 ? TAB_ORDER.length : TAB_ORDER.indexOf(key));

  return keys
    .map((key, i) => ({ key, i }))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.i - b.i)
    .map((item) => item.key);
}

function tabLabel(key) {
  if (OWN_LABELS.indexOf(key) !== -1) {
    return extractText(t('default_tab_' + key));
  }
  const transKey = 'core.lib.index_sort.' + key + '_button';
  const label = extractText(app.translator.trans(transKey));
  return label && label !== transKey ? label : key;
}

function parseDisabled(raw) {
  try {
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export default [
  new Extend.Admin()
    .setting(() => {
      const options = {};
      tabKeys().forEach((key) => {
        options[key] = tabLabel(key);
      });

      return {
        setting: 'prm-forum-activity.default_tab',
        type: 'select',
        label: t('default_tab_label'),
        help: t('default_tab_help'),
        options,
        default: 'latest',
      };
    }, 100)
    .setting(() => ({
      setting: 'prm-forum-activity.tab_style',
      type: 'select',
      label: t('tab_style_label'),
      help: t('tab_style_help'),
      options: {
        tabs: t('tab_style_tabs'),
        dropdown: t('tab_style_dropdown'),
      },
      default: 'tabs',
    }), 95)
    .customSetting(function () {
      const stream = this.setting(DISABLED_KEY, '[]');
      const disabled = parseDisabled(stream());

      return (
        <div className="Form-group PrmForumActivity-tabsSetting">
          <label>{t('tabs_label')}</label>
          <div className="helpText">{t('tabs_help')}</div>
          {tabKeys().map((key) => (
            <Switch
              state={disabled.indexOf(key) === -1}
              onchange={(enabled) => {
                const next = parseDisabled(stream()).filter((item) => item !== key);
                if (!enabled) {
                  next.push(key);
                }
                stream(JSON.stringify(next));
              }}
            >
              {tabLabel(key)}
            </Switch>
          ))}
        </div>
      );
    }, 90)
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
    }), 80)
    .setting(() => ({
      setting: 'prm-forum-activity.accent_color',
      type: 'text',
      label: t('accent_color_label'),
      help: t('accent_color_help'),
      default: '#2d8a4e',
    }), 70)
    .setting(() => ({
      setting: 'prm-forum-activity.color_rows',
      type: 'boolean',
      label: t('color_rows_label'),
      help: t('color_rows_help'),
    }), 60)
    .setting(() => ({
      setting: 'prm-forum-activity.sticky_highlight',
      type: 'boolean',
      label: t('sticky_highlight_label'),
      help: t('sticky_highlight_help'),
      default: true,
    }), 50)
    .permission(
      () => ({
        icon: 'fas fa-star',
        label: app.translator.trans('prm-forum-activity.admin.permissions.feature_label'),
        permission: 'discussion.feature',
      }),
      'moderate'
    ),
];
