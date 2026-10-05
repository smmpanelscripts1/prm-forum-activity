<?php

namespace Prm\ForumActivity\Api;

use Flarum\Api\Context;
use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;

class DiscussionResourceFields
{
    public function __invoke(): array
    {
        return [
            Schema\Boolean::make('isFeatured')
                ->writable(function (Discussion $discussion, Context $context) {
                    return $context->updating()
                        && $context->getActor()->can('feature', $discussion);
                })
                ->set(function (Discussion $discussion, bool $isFeatured, Context $context) {
                    if ((bool) $discussion->is_featured === $isFeatured) {
                        return;
                    }

                    $discussion->is_featured = $isFeatured;
                }),
            Schema\Boolean::make('canFeature')
                ->get(fn (Discussion $discussion, Context $context) => $context->getActor()->can('feature', $discussion)),
        ];
    }
}
