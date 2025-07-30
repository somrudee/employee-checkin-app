document.addEventListener('DOMContentLoaded', () => {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const currentStatusSpan = document.getElementById('currentStatus');
    const currentTimeSpan = document.getElementById('currentTime');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const lateAlertsDiv = document.getElementById('lateAlerts');
    const taskReminderDiv = document.getElementById('taskReminder');

    // กำหนดเวลาทำงาน (ตัวอย่าง: เริ่ม 08:00, เลิก 17:00)
    const WORK_START_HOUR = 8;
    const WORK_START_MINUTE = 0;
    const WORK_END_HOUR = 17;
    const WORK_END_MINUTE = 0;

    let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    let currentCheckIn = JSON.parse(localStorage.getItem('currentCheckIn')) || null;

    // ฟังก์ชันสำหรับฟอร์แมตวันที่และเวลา
    const formatDateTime = (date) => {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return date.toLocaleDateString('th-TH', options);
    };

    const formatDate = (date) => {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return date.toLocaleDateString('th-TH', options);
    };

    const formatTime = (date) => {
        const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        return date.toLocaleTimeString('th-TH', options);
    };

    // อัปเดตเวลาปัจจุบัน
    const updateCurrentTime = () => {
        currentTimeSpan.textContent = formatDateTime(new Date());
    };
    setInterval(updateCurrentTime, 1000); // อัปเดตทุกวินาที
    updateCurrentTime(); // แสดงผลทันทีเมื่อโหลดหน้า

    // โหลดสถานะและอัปเดต UI
    const loadState = () => {
        if (currentCheckIn) {
            currentStatusSpan.textContent = 'เช็คอินแล้ว';
            checkInBtn.disabled = true;
            checkOutBtn.disabled = false;
        } else {
            currentStatusSpan.textContent = 'ไม่ได้เช็คอิน';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
        }
        renderAttendanceRecords();
        checkLateArrivals();
        checkTaskReminder();
    };

    // เรนเดอร์บันทึกการเข้างาน
    const renderAttendanceRecords = () => {
        attendanceTableBody.innerHTML = ''; // เคลียร์ตารางก่อนเรนเดอร์ใหม่
        attendanceRecords.forEach(record => {
            const row = attendanceTableBody.insertRow();
            row.insertCell().textContent = record.date;
            row.insertCell().textContent = record.checkInTime;
            row.insertCell().textContent = record.checkOutTime || '-';
            row.insertCell().textContent = record.status;
            if (record.status === 'มาสาย') {
                row.classList.add('late-entry'); // เพิ่มคลาสสำหรับไฮไลต์
            }
        });
    };

    // ฟังก์ชันเช็คอิน
    checkInBtn.addEventListener('click', () => {
        const now = new Date();
        const todayDate = formatDate(now);
        const checkInTime = formatTime(now);

        // ตรวจสอบว่าเช็คอินไปแล้วสำหรับวันนี้หรือไม่
        const existingRecordToday = attendanceRecords.find(record => record.date === todayDate);
        if (existingRecordToday && existingRecordToday.checkInTime) {
            alert('คุณได้เช็คอินสำหรับวันนี้แล้ว!');
            return;
        }

        // ตรวจสอบการมาสาย
        let status = 'ตรงเวลา';
        const startWork = new Date();
        startWork.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

        if (now.getTime() > startWork.getTime()) {
            status = 'มาสาย';
        }

        currentCheckIn = {
            date: todayDate,
            checkInTime: checkInTime,
            checkOutTime: null,
            status: status
        };

        localStorage.setItem('currentCheckIn', JSON.stringify(currentCheckIn));
        loadState();
        alert('เช็คอินเรียบร้อย!');
    });

    // ฟังก์ชันเช็คเอาต์
    checkOutBtn.addEventListener('click', () => {
        if (!currentCheckIn) {
            alert('คุณยังไม่ได้เช็คอิน!');
            return;
        }

        const now = new Date();
        currentCheckIn.checkOutTime = formatTime(now);

        // หากมีบันทึกวันนี้แล้ว ให้อัปเดต
        const existingRecordIndex = attendanceRecords.findIndex(record => record.date === currentCheckIn.date);
        if (existingRecordIndex > -1) {
            attendanceRecords[existingRecordIndex] = currentCheckIn;
        } else {
            attendanceRecords.push(currentCheckIn);
        }

        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        currentCheckIn = null; // เคลียร์สถานะเช็คอินปัจจุบัน
        localStorage.removeItem('currentCheckIn');
        loadState();
        alert('เช็คเอาต์เรียบร้อย!');
    });

    // ตรวจสอบการมาสายเกิน 3 ครั้งต่อเดือน
    const checkLateArrivals = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const lateRecordsThisMonth = attendanceRecords.filter(record => {
            const recordDate = new Date(record.date.split('/').reverse().join('-')); // แปลง DD/MM/YYYY เป็น YYYY-MM-DD
            return record.status === 'มาสาย' &&
                   recordDate.getMonth() === currentMonth &&
                   recordDate.getFullYear() === currentYear;
        });

        lateAlertsDiv.innerHTML = '<h2>การแจ้งเตือน</h2>'; // เคลียร์ก่อนเพิ่มใหม่
        if (lateRecordsThisMonth.length >= 3) {
            const alertMessage = document.createElement('p');
            alertMessage.classList.add('alert-danger');
            alertMessage.textContent = `คุณมาสาย ${lateRecordsThisMonth.length} ครั้งในเดือนนี้! กรุณาปรับปรุงการมาทำงานให้ตรงเวลา.`;
            lateAlertsDiv.appendChild(alertMessage);
        } else if (lateRecordsThisMonth.length > 0) {
            const infoMessage = document.createElement('p');
            infoMessage.textContent = `คุณมาสาย ${lateRecordsThisMonth.length} ครั้งในเดือนนี้.`;
            lateAlertsDiv.appendChild(infoMessage);
        } else {
            const noAlertMessage = document.createElement('p');
            noAlertMessage.textContent = 'ไม่มีการมาสายในเดือนนี้';
            lateAlertsDiv.appendChild(noAlertMessage);
        }
    };

    // แจ้งเตือนให้เคลียร์งานก่อนเลิกงาน
    const checkTaskReminder = () => {
        const now = new Date();
        const endWork = new Date();
        endWork.setHours(WORK_END_HOUR, WORK_END_MINUTE, 0, 0);

        // แจ้งเตือน 30 นาทีก่อนเลิกงาน (สามารถปรับได้)
        const reminderTime = new Date(endWork.getTime() - (30 * 60 * 1000)); // 30 นาที

        taskReminderDiv.innerHTML = '<h2>แจ้งเตือนงานค้าง</h2>'; // เคลียร์ก่อนเพิ่มใหม่

        if (currentCheckIn && now.getTime() >= reminderTime.getTime() && now.getTime() < endWork.getTime()) {
            const reminderMessage = document.createElement('p');
            reminderMessage.classList.add('alert-warning');
            reminderMessage.textContent = `ใกล้ถึงเวลาเลิกงานแล้ว (${formatTime(endWork)})! กรุณาเร่งเคลียร์งานให้เสร็จ.`;
            taskReminderDiv.appendChild(reminderMessage);
        } else {
            const noReminderMessage = document.createElement('p');
            noReminderMessage.textContent = 'ยังไม่มีการแจ้งเตือนงานค้าง';
            taskReminderDiv.appendChild(noReminderMessage);
        }
    };

    // โหลดสถานะเมื่อหน้าเว็บโหลดเสร็จ
    loadState();
    // ตั้งเวลาตรวจสอบการแจ้งเตือนงานค้างทุกนาที (เพื่อความแม่นยำ)
    setInterval(checkTaskReminder, 60 * 1000);
});
