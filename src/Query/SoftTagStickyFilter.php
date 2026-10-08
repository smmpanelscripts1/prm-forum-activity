<?php

namespace Prm\ForumActivity\Query;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Illuminate\Support\Facades\Schema;

/**
 * Optional Stickiest tag-sticky filter.
 * Safe when huseyinfiliz/stickiest is not installed: returns empty results.
 *
 * @implements FilterInterface<DatabaseSearchState>
 */
class SoftTagStickyFilter implements FilterInterface
{
    public function getFilterKey(): string
    {
        return 'prmTagSticky';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        if (! $this->supported()) {
            if (! $negate) {
                $state->getQuery()->whereRaw('0 = 1');
            }

            return;
        }

        $state->getQuery()->where('discussions.is_tag_sticky', ! $negate);
    }

    protected function supported(): bool
    {
        try {
            return Schema::hasColumn('discussions', 'is_tag_sticky')
                && Schema::hasTable('discussion_sticky_tag');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
