"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CafesController = void 0;
const common_1 = require("@nestjs/common");
const cafes_service_1 = require("./cafes.service");
const search_cafes_dto_1 = require("./dto/search-cafes.dto");
const create_cafe_dto_1 = require("./dto/create-cafe.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
let CafesController = class CafesController {
    cafesService;
    constructor(cafesService) {
        this.cafesService = cafesService;
    }
    search(dto) {
        return this.cafesService.search(dto);
    }
    findOne(id) {
        return this.cafesService.findOne(id);
    }
    create(dto) {
        return this.cafesService.create(dto);
    }
};
exports.CafesController = CafesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_cafes_dto_1.SearchCafesDto]),
    __metadata("design:returntype", void 0)
], CafesController.prototype, "search", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CafesController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_cafe_dto_1.CreateCafeDto]),
    __metadata("design:returntype", void 0)
], CafesController.prototype, "create", null);
exports.CafesController = CafesController = __decorate([
    (0, common_1.Controller)('cafes'),
    __metadata("design:paramtypes", [cafes_service_1.CafesService])
], CafesController);
//# sourceMappingURL=cafes.controller.js.map