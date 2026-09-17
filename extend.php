<?php

namespace Prm\ForumActivity;

use Flarum\Api\Serializer\DiscussionSerializer;
use Flarum\Discussion\Discussion;
use Flarum\Discussion\Event\Saving;
use Flarum\Discussion\Filter\DiscussionFilterer;
use Flarum\Discussion\Search\DiscussionSearcher;
use Flarum\Extend;
use Prm\ForumActivity\Listener\SaveFeaturedToDatabase;
use Prm\ForumActivity\Query\FeaturedFilterGambit;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Model(Discussion::class))
        ->cast('is_featured', 'bool'),

    (new Extend\ApiSerializer(DiscussionSerializer::class))
        ->attribute('isFeatured', function (DiscussionSerializer $serializer, Discussion $discussion) {
            return (bool) $discussion->is_featured;
        })
        ->attribute('canFeature', function (DiscussionSerializer $serializer, Discussion $discussion) {
            return (bool) $serializer->getActor()->can('feature', $discussion);
        }),

    (new Extend\Event())
        ->listen(Saving::class, SaveFeaturedToDatabase::class),

    (new Extend\Filter(DiscussionFilterer::class))
        ->addFilter(FeaturedFilterGambit::class),

    (new Extend\SimpleFlarumSearch(DiscussionSearcher::class))
        ->addGambit(FeaturedFilterGambit::class),
];
