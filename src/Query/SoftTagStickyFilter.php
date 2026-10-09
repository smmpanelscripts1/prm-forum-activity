<?php

namespace Prm\ForumActivity\Query;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;

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
        if (! $this->supported($state)) {
            if (! $negate) {
                $state->getQuery()->whereRaw('0 = 1');
            }

            return;
        }

        $state->getQuery()->where('discussions.is_tag_sticky', ! $negate);
    }

    protected function supported(SearchState $state): bool
    {
        try {
            $schema = $state->getQuery()->getConnection()->getSchemaBuilder();

            return $schema->hasColumn('discussions', 'is_tag_sticky')
                && $schema->hasTable('discussion_sticky_tag');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
