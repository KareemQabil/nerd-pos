import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto';
import { ProductListItemDto } from './product-response.dto';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID (UUID)', example: 'cat_123' })
  id: string;

  @ApiPropertyOptional({ description: 'Parent category ID', example: 'cat_parent_1' })
  parentId?: string | null;

  @ApiProperty({ description: 'Category name (English)', example: 'Hot Beverages' })
  nameEn: string;

  @ApiProperty({ description: 'Category name (Arabic)', example: 'Hot Beverages (AR)' })
  nameAr: string;

  @ApiPropertyOptional({ description: 'Category image URL', example: 'https://cdn.example.com/category.jpg' })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: 'Whether the category is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created timestamp', example: '2026-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last updated timestamp', example: '2026-01-20T14:45:00Z' })
  updatedAt: Date;
}

export class ModifierOptionResponseDto {
  @ApiProperty({ description: 'Modifier option ID (UUID)', example: 'opt_123' })
  id: string;

  @ApiProperty({ description: 'Modifier group ID (UUID)', example: 'grp_123' })
  groupId: string;

  @ApiProperty({ description: 'Option name (English)', example: 'Extra Cheese' })
  nameEn: string;

  @ApiProperty({ description: 'Option name (Arabic)', example: 'Extra Cheese (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Option price', example: 5 })
  price: number;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: 'Whether option is active', example: true })
  isActive: boolean;
}

export class ModifierGroupResponseDto {
  @ApiProperty({ description: 'Modifier group ID (UUID)', example: 'grp_123' })
  id: string;

  @ApiProperty({ description: 'Group name (English)', example: 'Add-ons' })
  nameEn: string;

  @ApiProperty({ description: 'Group name (Arabic)', example: 'Add-ons (AR)' })
  nameAr: string;

  @ApiProperty({ description: 'Selection type', example: 'MULTI' })
  selectionType: string;

  @ApiProperty({ description: 'Is required', example: false })
  isRequired: boolean;

  @ApiProperty({ description: 'Minimum selections', example: 0 })
  minSelections: number;

  @ApiPropertyOptional({ description: 'Maximum selections', example: 3 })
  maxSelections?: number | null;

  @ApiProperty({ description: 'Sort order', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: 'Whether group is active', example: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Modifier options',
    type: () => ModifierOptionResponseDto,
    isArray: true,
  })
  options?: ModifierOptionResponseDto[];
}

export class ProductPaginatedResponseDto extends PaginatedResponseDto<ProductListItemDto> {
  @ApiProperty({
    description: 'Products for current page',
    type: () => ProductListItemDto,
    isArray: true,
  })
  data: ProductListItemDto[];
}

export class CategoryPaginatedResponseDto extends PaginatedResponseDto<CategoryResponseDto> {
  @ApiProperty({
    description: 'Categories for current page',
    type: () => CategoryResponseDto,
    isArray: true,
  })
  data: CategoryResponseDto[];
}

export class ModifierGroupPaginatedResponseDto extends PaginatedResponseDto<ModifierGroupResponseDto> {
  @ApiProperty({
    description: 'Modifier groups for current page',
    type: () => ModifierGroupResponseDto,
    isArray: true,
  })
  data: ModifierGroupResponseDto[];
}
