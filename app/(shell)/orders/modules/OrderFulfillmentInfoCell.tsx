'use client';

import { formatFulfillmentDate } from './utils';

type FulfillmentInfo = { date: string; carrier: string; trackingNumber: string; trackingUrl: string };

type OrderFulfillmentInfoCellProps = {
  fulfillmentInfo: FulfillmentInfo[];
  userIsDecorator?: boolean;
};

export default function OrderFulfillmentInfoCell({ fulfillmentInfo, userIsDecorator = false }: OrderFulfillmentInfoCellProps) {
  return (
    <td className="px-4 py-3 text-xs text-gray-600">
      {fulfillmentInfo.length > 0 ? (
        <div className="space-y-2">
          {fulfillmentInfo.map((info, infoIndex) => (
            <div key={infoIndex}>
              {infoIndex > 0 && <div className="border-t border-gray-200 my-2" />}
              <div className="space-y-0.5">
                {info.date && (
                  <div className="text-gray-700 font-medium">{formatFulfillmentDate(info.date)}</div>
                )}
                {!userIsDecorator && info.carrier && (
                  <div className="text-gray-500">{info.carrier}</div>
                )}
                {!userIsDecorator && info.trackingNumber && (
                  <div>
                    {info.trackingUrl ? (
                      <a
                        href={info.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {info.trackingNumber}
                      </a>
                    ) : (
                      <span className="text-gray-600">{info.trackingNumber}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </td>
  );
}
