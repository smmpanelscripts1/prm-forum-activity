<?php

use Flarum\Database\Migration;

return Migration::addColumns('discussions', [
    'is_featured' => ['boolean', 'default' => 0],
]);
