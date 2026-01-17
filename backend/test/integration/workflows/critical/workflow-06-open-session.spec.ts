/**
 * Workflow 6: Open Session
 * 
 * Source: WORKFLOWS.md - Session Management Workflows
 * 
 * Scenario: Cashier starts shift, opens session
 * Tests: Service logic with mocked repository
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../../src/modules/sessions/sessions.repository';
import { IEventBus } from '../../../../src/core/event-bus/event-bus.interface';
import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('Workflow 6: Open Session', () => {
    let service: SessionsService;
    let mockRepo: jest.Mocked<SessionsRepository>;
    let mockEventBus: jest.Mocked<IEventBus>;
    let sessionCounter = 0;

    beforeEach(async () => {
        sessionCounter = 0;

        mockRepo = {
            findOpenSession: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((data) =>
                Promise.resolve({
                    id: `session-${Date.now()}-${++sessionCounter}`,
                    ...data,
                })
            ),
            findById: jest.fn(),
            update: jest.fn(),
            countByPrefix: jest.fn().mockResolvedValue(sessionCounter),
            createDenomination: jest.fn(),
            findWithDetails: jest.fn(),
            findByUser: jest.fn(),
        } as any;

        mockEventBus = {
            publish: jest.fn().mockResolvedValue(undefined),
            subscribe: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionsService,
                { provide: SessionsRepository, useValue: mockRepo },
                { provide: 'IEventBus', useValue: mockEventBus },
            ],
        }).compile();

        service = module.get<SessionsService>(SessionsService);
    });

    // Test 6.1: Create session with opening balance
    describe('6.1: Create Session with Opening Balance', () => {
        it('should create session with correct opening balance', async () => {
            const userId = 'user-123';
            const openingBalance = 500;

            const session = await service.openSession({ userId, openingBalance });

            expect(session).toBeDefined();
            expect(session.status).toBe('OPEN');
            expect(new Decimal(session.openingBalance).equals(new Decimal(500))).toBe(true);
            expect(session.userId).toBe(userId);
        });

        it('should initialize session with zero sales', async () => {
            const session = await service.openSession({
                userId: 'user-456',
                openingBalance: 500,
            });

            expect(session.totalSales).toBe(0);
            expect(session.totalCash).toBe(0);
            expect(session.totalCard).toBe(0);
            expect(session.orderCount).toBe(0);
        });

        it('should publish SessionOpened event', async () => {
            await service.openSession({
                userId: 'user-789',
                openingBalance: 500,
            });

            expect(mockEventBus.publish).toHaveBeenCalledWith(
                'SessionOpened',
                expect.objectContaining({
                    userId: 'user-789',
                    openingBalance: 500,
                }),
            );
        });
    });

    // Test 6.2: Terminal locked (no duplicate session)
    describe('6.2: Duplicate Session Blocked', () => {
        it('should throw error when user already has open session', async () => {
            // First call: no existing session
            mockRepo.findOpenSession.mockResolvedValueOnce(null);

            await service.openSession({
                userId: 'user-existing',
                openingBalance: 500,
            });

            // Second call: existing session found
            mockRepo.findOpenSession.mockResolvedValue({
                id: 'existing-session',
                sessionNumber: 'SES20260100001',
                status: 'OPEN',
            } as any);

            await expect(
                service.openSession({
                    userId: 'user-existing',
                    openingBalance: 500,
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should allow different users to open sessions', async () => {
            mockRepo.findOpenSession.mockResolvedValue(null);

            const session1 = await service.openSession({
                userId: 'user-1',
                openingBalance: 500,
            });

            const session2 = await service.openSession({
                userId: 'user-2',
                openingBalance: 300,
            });

            expect(session1).toBeDefined();
            expect(session2).toBeDefined();
            expect(session1.id).not.toBe(session2.id);
        });
    });

    // Test 6.3: Session number generation
    describe('6.3: Session Number Generation', () => {
        it('should generate session number in correct format', async () => {
            const session = await service.openSession({
                userId: 'user-gen',
                openingBalance: 100,
            });

            // Format: SESYYYYMMNNNN (e.g., SES2026010001)
            expect(session.sessionNumber).toBeDefined();
            expect(session.sessionNumber).toMatch(/^SES\d{6}\d{4}$/);
        });

        it('should call countByPrefix to get next number', async () => {
            await service.openSession({
                userId: 'user-count',
                openingBalance: 100,
            });

            expect(mockRepo.countByPrefix).toHaveBeenCalled();
        });
    });
});
