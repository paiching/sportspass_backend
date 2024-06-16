const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  sessionTime: { type: Date, required: true },
  sessionName: { type: String, required: true },
  sessionPlace: { type: String, required: true },
  sessionSalesPeriod: { type: Date, required: true },
  areaSetting: [
    {
      areaVenuePic: { type: String, required: true },
      areaColor: { type: String, required: true },
      areaName: { type: String, required: true },
      areaPrice: { type: Number, required: true },
      areaTicketType: [
        {
          ticketName: { type: String, required: true },
          ticketDiscount: { type: Number, required: true },
          areaNumber: { type: Number, required: true }
        }
      ]
    }
  ]
}, {
  timestamps: true
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = { Session };
