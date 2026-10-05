<?php

namespace Prm\ForumActivity;

use Flarum\Api\Resource;
use Flarum\Discussion\Discussion;
use Flarum\Discussion\Search\DiscussionSearcher;
use Flarum\Extend;
use Flarum\Search\Database\DatabaseSearchDriver;
use Prm\ForumActivity\Api\DiscussionResourceFields;
use Prm\ForumActivity\Query\FeaturedFilter;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Model(Discussion::class))
        ->cast('is_featured', 'bool'),

    (new Extend\ApiResource(Resource\DiscussionResource::class))
        ->fields(DiscussionResourceFields::class),

    (new Extend\SearchDriver(DatabaseSearchDriver::class))
        ->addFilter(DiscussionSearcher::class, FeaturedFilter::class),
];
