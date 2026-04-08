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
exports.OwnerController = void 0;
const common_1 = require("@nestjs/common");
const owner_service_1 = require("./owner.service");
const update_cafe_dto_1 = require("./dto/update-cafe.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let OwnerController = class OwnerController {
    ownerService;
    constructor(ownerService) {
        this.ownerService = ownerService;
    }
    getDashboard(req) {
        return this.ownerService.getDashboard(req.user.id);
    }
    getCafe(req) {
        return this.ownerService.getOwnerCafe(req.user.id);
    }
    createCafe(req, dto) {
        return this.ownerService.createCafe(req.user.id, dto);
    }
    updateCafe(req, dto) {
        return this.ownerService.updateCafe(req.user.id, dto);
    }
    updateMenus(req, dto) {
        return this.ownerService.updateMenus(req.user.id, dto.items);
    }
};
exports.OwnerController = OwnerController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OwnerController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('cafe'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OwnerController.prototype, "getCafe", null);
__decorate([
    (0, common_1.Post)('cafe'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_cafe_dto_1.CreateOwnerCafeDto]),
    __metadata("design:returntype", void 0)
], OwnerController.prototype, "createCafe", null);
__decorate([
    (0, common_1.Put)('cafe'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_cafe_dto_1.UpdateCafeDto]),
    __metadata("design:returntype", void 0)
], OwnerController.prototype, "updateCafe", null);
__decorate([
    (0, common_1.Put)('cafe/menus'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_cafe_dto_1.UpdateMenusDto]),
    __metadata("design:returntype", void 0)
], OwnerController.prototype, "updateMenus", null);
exports.OwnerController = OwnerController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('owner'),
    (0, common_1.Controller)('owner'),
    __metadata("design:paramtypes", [owner_service_1.OwnerService])
], OwnerController);
//# sourceMappingURL=owner.controller.js.map