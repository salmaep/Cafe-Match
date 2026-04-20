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
exports.RecapsController = void 0;
const common_1 = require("@nestjs/common");
const recaps_service_1 = require("./recaps.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const class_validator_1 = require("class-validator");
class GenerateRecapDto {
    year;
}
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], GenerateRecapDto.prototype, "year", void 0);
let RecapsController = class RecapsController {
    recapsService;
    constructor(recapsService) {
        this.recapsService = recapsService;
    }
    getRecap(user, year) {
        return this.recapsService.getRecap(user.id, year);
    }
    generate(user, dto) {
        return this.recapsService.generateRecap(user.id, dto.year);
    }
};
exports.RecapsController = RecapsController;
__decorate([
    (0, common_1.Get)(':year'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], RecapsController.prototype, "getRecap", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GenerateRecapDto]),
    __metadata("design:returntype", void 0)
], RecapsController.prototype, "generate", null);
exports.RecapsController = RecapsController = __decorate([
    (0, common_1.Controller)('recaps'),
    __metadata("design:paramtypes", [recaps_service_1.RecapsService])
], RecapsController);
//# sourceMappingURL=recaps.controller.js.map