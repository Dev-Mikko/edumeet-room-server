import 'jest';
import { Router } from '../../src/media/Router';
import { MediaNodeConnection } from '../../src/media/MediaNodeConnection';
import MediaNode from '../../src/media/MediaNode';
import { RtpParameters } from 'mediasoup-client/lib/RtpParameters';
import { SrtpParameters } from '../../src/common/types';
import { PipeTransport } from '../../src/media/PipeTransport';

describe('PipeTransport', () => {
	let pipeTransport: PipeTransport;

	const pipeTransportId = 'pipeTransportId';
	const ip = '1.1.1.1';
	const port = 1234;
	const srtpParameters = {} as SrtpParameters;

	const connection = {
		ready: Promise.resolve(),
		close: jest.fn(),
		notify: jest.fn(),
		request: jest.fn(),
		on: jest.fn(),
		once: jest.fn(),
		pipeline: {
			use: jest.fn(),
			remove: jest.fn(),
			execute: jest.fn(),
		},
	} as unknown as MediaNodeConnection;

	const mediaNode = new MediaNode({
		id: 'testId1',
		hostname: 'testHostname',
		port: 1234,
		secret: 'testSecret',
	});

	const router = new Router({
		mediaNode,
		connection,
		id: 'testId1',
		rtpCapabilities: {},
	});

	beforeEach(() => {
		pipeTransport = new PipeTransport({
			router,
			connection,
			id: pipeTransportId,
			ip,
			port,
			srtpParameters,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('Has correct properties', () => {
		expect(pipeTransport.closed).toBe(false);
	});

	it('close()', () => {
		const pipeTransportMiddleware = pipeTransport['pipeTransportMiddleware'];

		pipeTransport.connection.notify = jest.fn(({ method, data }) => {
			return ({
				'closePipeTransport': () => {
					expect(data.routerId).toBe(pipeTransport.router.id);
					expect(data.pipeTransportId).toBe(pipeTransportId);
				},
			}[method] ?? (() => expect(true).toBe(false)))();
		});

		pipeTransport.close();
		expect(pipeTransport.connection.notify).toBeCalledTimes(1);
		expect(pipeTransport.closed).toBe(true);
		expect(pipeTransport.connection.pipeline.remove).
			toHaveBeenCalledWith(pipeTransportMiddleware);
	});

	it('connect()', async () => {
		pipeTransport.connection.request = jest.fn(async ({ method, data }) => {
			return ({
				'connectPipeTransport': () => {
					expect(data.routerId).toBe(pipeTransport.router.id);
					expect(data.pipeTransportId).toBe(pipeTransportId);
					expect(data.ip).toBe(ip);
					expect(data.port).toBe(port);
					expect(data.srtpParameters).toBe(srtpParameters);
				}
			}[method] ?? (() => expect(true).toBe(false)))();
		});

		await pipeTransport.connect({ ip, port, srtpParameters });
		expect(pipeTransport.connection.request).toBeCalledTimes(1);
	});

	it('produce()', async () => {
		const producerId = 'testProducerId';
		const rtpParameters = {} as RtpParameters;

		pipeTransport.connection.request = jest.fn(async ({ method, data }) => {
			return ({
				'createPipeProducer': () => {
					expect(data.routerId).toBe(pipeTransport.router.id);
					expect(data.pipeTransportId).toBe(pipeTransportId);
					expect(data.producerId).toBe(producerId);
					expect(data.kind).toBe('audio');
					expect(data.paused).toBe(false);
					expect(data.rtpParameters).toBe(rtpParameters);

					return { id: producerId };
				}
			}[method] ?? (() => expect(true).toBe(false)))();
		});

		const pipeProducer = await pipeTransport.produce({
			producerId,
			kind: 'audio',
			paused: false,
			rtpParameters,
		});

		expect(pipeProducer.id).toBe(producerId);
		expect(pipeProducer.router).toBe(router);
		expect(pipeTransport.pipeProducers.has(producerId)).toBe(true);
	});

	it('consume()', async () => {
		const producerId = 'testProducerId';
		const consumerId = 'testConsumerId';
		const rtpParameters = {} as RtpParameters;

		pipeTransport.connection.request = jest.fn(async ({ method, data }) => {
			return ({
				'createPipeConsumer': () => {
					expect(data.routerId).toBe(pipeTransport.router.id);
					expect(data.pipeTransportId).toBe(pipeTransportId);
					expect(data.producerId).toBe(producerId);

					return {
						id: consumerId,
						kind: 'audio',
						producerPaused: false,
						rtpParameters,
					};
				}
			}[method] ?? (() => expect(true).toBe(false)))();
		});

		const pipeConsumer = await pipeTransport.consume({
			producerId,
		});

		expect(pipeConsumer.id).toBe(consumerId);
		expect(pipeConsumer.router).toBe(router);
		expect(pipeTransport.pipeConsumers.has(consumerId)).toBe(true);
	});
});