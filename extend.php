<?php

namespace Prm\ForumActivity;

use Flarum\Api\Resource;
use Flarum\Discussion\Discussion;
use Flarum\Discussion\Search\DiscussionSearcher;
use Flarum\Extend;
use Flarum\Search\Database\DatabaseSearchDriver;
use Prm\ForumActivity\Api\DiscussionResourceFields;
use Prm\ForumActivity\Query\FeaturedFilter;
use Prm\ForumActivity\Query\SoftStickiestFilter;
use Prm\ForumActivity\Query\SoftTagStickyFilter;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Settings())
        ->default('prm-forum-activity.default_tab', 'latest')
        ->default('prm-forum-activity.color_mode', 'default')
        ->default('prm-forum-activity.accent_color', '#2d8a4e')
        ->default('prm-forum-activity.color_rows', '0')
        ->default('prm-forum-activity.sticky_highlight', '1')
        ->serializeToForum('prmForumActivityDefaultTab', 'prm-forum-activity.default_tab', function ($value) {
            $allowed = ['latest', 'featured', 'newest', 'popular'];

            return in_array($value, $allowed, true) ? $value : 'latest';
        })
        ->serializeToForum('prmForumActivityColorMode', 'prm-forum-activity.color_mode', function ($value) {
            $allowed = ['default', 'theme', 'tag', 'manual'];

            return in_array($value, $allowed, true) ? $value : 'default';
        })
        ->serializeToForum('prmForumActivityAccentColor', 'prm-forum-activity.accent_color', function ($value) {
            $value = trim((string) $value);

            return preg_match('/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/', $value) ? $value : '#2d8a4e';
        })
        ->serializeToForum('prmForumActivityColorRows', 'prm-forum-activity.color_rows', function ($value) {
            return $value === '1' || $value === 1 || $value === true;
        })
        ->serializeToForum('prmForumActivityStickyHighlight', 'prm-forum-activity.sticky_highlight', function ($value) {
            return ! ($value === '0' || $value === 0 || $value === false);
        }),

    (new Extend\Model(Discussion::class))
        ->cast('is_featured', 'bool'),

    (new Extend\ApiResource(Resource\DiscussionResource::class))
        ->fields(DiscussionResourceFields::class),

    (new Extend\SearchDriver(DatabaseSearchDriver::class))
        ->addFilter(DiscussionSearcher::class, FeaturedFilter::class)
        ->addFilter(DiscussionSearcher::class, SoftStickiestFilter::class)
        ->addFilter(DiscussionSearcher::class, SoftTagStickyFilter::class),
];
