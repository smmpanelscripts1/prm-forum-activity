<?php

namespace Prm\ForumActivity\Listener;

use Flarum\Discussion\Event\Saving;

class SaveFeaturedToDatabase
{
    public function handle(Saving $event)
    {
        if (! isset($event->data['attributes']['isFeatured'])) {
            return;
        }

        $isFeatured = (bool) $event->data['attributes']['isFeatured'];
        $discussion = $event->discussion;
        $actor = $event->actor;

        $actor->assertCan('feature', $discussion);

        if ((bool) $discussion->is_featured === $isFeatured) {
            return;
        }

        $discussion->is_featured = $isFeatured;
    }
}
