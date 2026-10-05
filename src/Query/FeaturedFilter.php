<?php

namespace Prm\ForumActivity\Query;

use Flarum\Search\Database\DatabaseSearchState;
use Flarum\Search\Filter\FilterInterface;
use Flarum\Search\SearchState;
use Illuminate\Database\Eloquent\Builder;

/**
 * @implements FilterInterface<DatabaseSearchState>
 */
class FeaturedFilter implements FilterInterface
{
    public function getFilterKey(): string
    {
        return 'featured';
    }

    public function filter(SearchState $state, string|array $value, bool $negate): void
    {
        $this->constrain($state->getQuery(), $negate);
    }

    protected function constrain(Builder $query, bool $negate): void
    {
        $query->where('is_featured', ! $negate);
    }
}
