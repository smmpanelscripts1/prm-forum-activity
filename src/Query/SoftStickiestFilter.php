<?php

namespace Prm\ForumActivity\Query;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Illuminate\Support\Facades\Schema;

/**
 * Optional Stickiest (super sticky) filter.
 * Safe when huseyinfiliz/stickiest is not installed: returns empty results.
 *
 * @implements FilterInterface<DatabaseSearchState>
 */
class SoftStickiestFilter implements FilterInterface
{
    public function getFilterKey(): string
    {
        return 'prmStickiest';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        if (! $this->supported()) {
            if (! $negate) {
                $state->getQuery()->whereRaw('0 = 1');
            }

            return;
        }

        $state->getQuery()->where('discussions.is_stickiest', ! $negate);
    }

    protected function supported(): bool
    {
        try {
            return Schema::hasColumn('discussions', 'is_stickiest');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
