import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';
import type { ServerFilter, GameVersion, ServerType } from '@/types';

interface ServerFilterProps {
  filter: ServerFilter;
  onFilterChange: (filter: ServerFilter) => void;
}

const VERSION_OPTIONS: { value: GameVersion; label: string }[] = [
  { value: '1.21', label: '1.21' },
  { value: '1.20', label: '1.20' },
  { value: '1.19', label: '1.19' },
  { value: '1.18', label: '1.18' },
  { value: '1.17', label: '1.17' },
  { value: '1.16', label: '1.16' },
  { value: '1.15', label: '1.15' },
  { value: '1.14', label: '1.14' },
  { value: '1.13', label: '1.13' },
  { value: '1.12', label: '1.12' },
  { value: '1.11', label: '1.11' },
  { value: '1.10', label: '1.10' },
  { value: '1.9', label: '1.9' },
  { value: '1.8', label: '1.8' },
  { value: '1.7', label: '1.7' },
  { value: 'other', label: '其他' },
];

const TYPE_OPTIONS: { value: ServerType; label: string }[] = [
  { value: 'survival', label: '生存' },
  { value: 'creative', label: '创造' },
  { value: 'rpg', label: 'RPG' },
  { value: 'minigame', label: '小游戏' },
  { value: 'skyblock', label: '空岛' },
  { value: 'prison', label: '监狱' },
  { value: 'factions', label: '派系' },
  { value: 'other', label: '其他' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '最热' },
  { value: 'featured', label: '推荐' },
];

export function ServerFilterComponent({ filter, onFilterChange }: ServerFilterProps) {
  const [searchInput, setSearchInput] = useState(filter.search || '');

  const handleSearch = () => {
    onFilterChange({ ...filter, search: searchInput });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFilterChange({});
  };

  const hasActiveFilters = filter.version || filter.server_type || filter.is_pure_public !== undefined || filter.requires_whitelist !== undefined || filter.requires_genuine !== undefined || filter.search;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">筛选条件</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-1 h-4 w-4" />
            清空
          </Button>
        )}
      </div>

      {/* 搜索 */}
      <div className="space-y-2">
        <Label htmlFor="search">搜索</Label>
        <div className="flex gap-2">
          <Input
            id="search"
            placeholder="搜索服务器名称或描述..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 版本 */}
      <div className="space-y-2">
        <Label htmlFor="version">游戏版本</Label>
        <Select
          value={filter.version || 'all'}
          onValueChange={(value) =>
            onFilterChange({ ...filter, version: value === 'all' ? undefined : value as GameVersion })
          }
        >
          <SelectTrigger id="version">
            <SelectValue placeholder="全部版本" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部版本</SelectItem>
            {VERSION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 类型 */}
      <div className="space-y-2">
        <Label htmlFor="type">服务器类型</Label>
        <Select
          value={filter.server_type || 'all'}
          onValueChange={(value) =>
            onFilterChange({ ...filter, server_type: value === 'all' ? undefined : value as ServerType })
          }
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 排序 */}
      <div className="space-y-2">
        <Label htmlFor="sort">排序方式</Label>
        <Select
          value={filter.sort || 'latest'}
          onValueChange={(value) =>
            onFilterChange({ ...filter, sort: value as 'latest' | 'popular' | 'featured' })
          }
        >
          <SelectTrigger id="sort">
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 特性筛选 */}
      <div className="space-y-2">
        <Label>特性筛选</Label>
        <div className="space-y-2">
          <Button
            variant={filter.is_pure_public === true ? 'default' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() =>
              onFilterChange({
                ...filter,
                is_pure_public: filter.is_pure_public === true ? undefined : true,
              })
            }
          >
            纯公益
          </Button>
          <Button
            variant={filter.requires_genuine === true ? 'default' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() =>
              onFilterChange({
                ...filter,
                requires_genuine: filter.requires_genuine === true ? undefined : true,
              })
            }
          >
            正版验证
          </Button>
          <Button
            variant={filter.requires_whitelist === false ? 'default' : 'outline'}
            size="sm"
            className="w-full"
            onClick={() =>
              onFilterChange({
                ...filter,
                requires_whitelist: filter.requires_whitelist === false ? undefined : false,
              })
            }
          >
            无需白名单
          </Button>
        </div>
      </div>
    </div>
  );
}
