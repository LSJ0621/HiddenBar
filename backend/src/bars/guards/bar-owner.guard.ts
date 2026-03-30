import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bar } from '../../entities/bar.entity.js';

/**
 * 가게 소유자 확인 가드. 요청 파라미터의 :id에 해당하는 가게의 소유자인지 검증한다.
 */
@Injectable()
export class BarOwnerGuard implements CanActivate {
  constructor(
    @InjectRepository(Bar)
    private readonly barRepository: Repository<Bar>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: { id: string }; user?: { id: number } }>();
    const barId = Number(request.params.id);
    const userId = request.user?.id;

    const bar = await this.barRepository.findOne({ where: { id: barId } });

    if (!bar) {
      throw new NotFoundException('Bar not found.');
    }

    if (bar.ownerId !== userId) {
      throw new ForbiddenException('Only the bar owner can access this resource.');
    }

    return true;
  }
}
